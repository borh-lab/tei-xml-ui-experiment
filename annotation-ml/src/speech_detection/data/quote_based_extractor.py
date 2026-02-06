"""Quote-based speech labels using Quote Baseline detection.

This module uses the proven Quote Baseline quote detection to generate
correct BIO labels for quoted speech, avoiding the complexities of
implementing custom quote parsing.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional

from speech_detection.models.baselines.quote_baseline import QuoteBaselineModel
from speech_detection.models.protocols import QuoteBaselineConfig


def generate_quote_based_labels(paragraphs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate quote-based speech labels using Quote Baseline.

    Uses the Quote Baseline's proven quote detection to identify quoted
    speech and generate BIO labels.

    Args:
        paragraphs: List of paragraph dictionaries with 'text' and 'tokens'

    Returns:
        List of paragraph dictionaries with 'bio_labels' added/updated

    Example:
        >>> paragraphs = [{'text': 'He said "hi".', 'tokens': ['He', 'said', '"hi."']}]
        >>> labeled = generate_quote_based_labels(paragraphs)
        >>> labeled[0]['bio_labels']
        ['O', 'O', 'B-DIRECT', 'I-DIRECT']
    """
    # Initialize Quote Baseline
    baseline = QuoteBaselineModel(QuoteBaselineConfig())

    # Get predictions
    predictions = baseline.predict_paragraphs(paragraphs)

    # Add bio_labels to paragraphs
    result = []
    for para, pred in zip(paragraphs, predictions, strict=True):
        para_with_labels = para.copy()
        para_with_labels["bio_labels"] = pred.predicted_bio_labels
        result.append(para_with_labels)

    return result


def extract_quote_speech_from_tei(tei_file: str) -> List[Dict[str, Any]]:
    """Extract quote-based speech annotations from TEI XML file.

    Args:
        tei_file: Path to TEI XML file

    Returns:
        List of paragraph dictionaries with quote-based BIO labels
    """
    import os

    from lxml import etree

    # Parse TEI file
    tree = etree.parse(tei_file)
    root = tree.getroot()

    # Namespace
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}

    # Build paragraphs from <p> elements
    paragraphs = []
    doc_id = os.path.splitext(os.path.basename(tei_file))[0]

    for para_idx, p_elem in enumerate(root.findall(".//tei:p", ns)):
        # Get text content
        text = etree.tostring(p_elem, encoding="unicode", method="text")

        if not text or not text.strip():
            continue

        # Tokenize (simple whitespace split)
        tokens = text.split()

        paragraphs.append(
            {
                "doc_id": doc_id,
                "para_id": f"{doc_id}_para{para_idx}",
                "text": text,
                "tokens": tokens,
            }
        )

    # Generate quote-based labels using Quote Baseline
    labeled_paragraphs = generate_quote_based_labels(paragraphs)

    return labeled_paragraphs


class QuoteBasedSpeechExtractor:
    """Parser that uses quote-based speech detection instead of XML annotations.

    This class provides the same interface as TEIParser but generates
    speech labels using the Quote Baseline instead of reading annotations
    from the XML file. This is useful for corpora like novel-dialogism
    where the XML annotations use anchor spans that are difficult to parse.

    Example:
        >>> from speech_detection.data.quote_based_extractor import QuoteBasedSpeechExtractor
        >>> parser = QuoteBasedSpeechExtractor()
        >>> doc = parser.parse_tei_file('novel.tei.xml', 'novel')
        >>> paragraphs = parser.create_tokenized_paragraphs(doc)
    """

    def __init__(self):
        """Initialize the parser with a Quote Baseline model."""
        self.baseline = QuoteBaselineModel(QuoteBaselineConfig())

    def parse_tei_file(self, tei_file: str, doc_id: Optional[str] = None):
        """Parse a TEI XML file and extract text and tokens.

        Args:
            tei_file: Path to TEI XML file
            doc_id: Optional document ID (uses filename if not provided)

        Returns:
            Dictionary with doc_id and list of paragraph dictionaries
        """
        from lxml import etree

        if doc_id is None:
            doc_id = Path(tei_file).stem

        # Parse TEI file
        tree = etree.parse(tei_file)
        root = tree.getroot()

        # Namespace
        ns = {"tei": "http://www.tei-c.org/ns/1.0"}

        # Build paragraphs from <p> elements
        paragraphs = []
        for p_elem in root.findall(".//tei:p", ns):
            # Get text content
            text = etree.tostring(p_elem, encoding="unicode", method="text")

            if not text or not text.strip():
                continue

            # Tokenize (simple whitespace split)
            tokens = text.split()

            paragraphs.append(
                {
                    "text": text,
                    "tokens": tokens,
                }
            )

        return {"doc_id": doc_id, "paragraphs": paragraphs}

    def create_tokenized_paragraphs(self, doc) -> List[Dict[str, Any]]:
        """Create tokenized paragraphs with quote-based speech labels.

        Args:
            doc: Dictionary from parse_tei_file with 'doc_id' and 'paragraphs'

        Returns:
            List of paragraph dictionaries with quote-based BIO labels
        """
        # Prepare paragraphs for baseline
        paragraphs_for_baseline = []
        for i, para in enumerate(doc["paragraphs"]):
            paragraphs_for_baseline.append(
                {
                    "doc_id": doc["doc_id"],
                    "para_id": f"{doc['doc_id']}_para{i}",
                    "text": para["text"],
                    "tokens": para["tokens"],
                }
            )

        # Generate quote-based labels using baseline
        labeled_paragraphs = generate_quote_based_labels(paragraphs_for_baseline)

        return labeled_paragraphs

    def parse_and_label(self, tei_file: str, doc_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Convenience method to parse file and generate labels in one step.

        Args:
            tei_file: Path to TEI XML file
            doc_id: Optional document ID (uses filename if not provided)

        Returns:
            List of paragraph dictionaries with quote-based BIO labels
        """
        doc = self.parse_tei_file(tei_file, doc_id)
        return self.create_tokenized_paragraphs(doc)
