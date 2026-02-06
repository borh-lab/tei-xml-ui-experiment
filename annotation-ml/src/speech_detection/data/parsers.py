"""Fast lxml-based TEI parser for speech detection."""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from lxml import etree

from speech_detection.data.protocols import TEIDocument, TEIParagraph


class TEIParser:
    """Fast TEI parser using lxml for high-performance XML parsing."""

    # Speech tags to look for in TEI
    # Based on ../docs/corpus-reference.md
    SPEECH_TAGS = {
        "q",        # Quotation marks (universal across most corpora)
        "quote",    # Generic quotation
        "said",     # Direct speech with speaker attribution
        "sp",       # Speech sections in drama
        "s",        # Sub-quotations (Novel Dialogism custom schema)
        "speech",   # Generic speech tag (not common in our corpora)
    }

    # Paragraph-like tags
    PARAGRAPH_TAGS = {"p", "ab", "l"}

    # XML namespaces (TEI often uses namespaces)
    NAMESPACES = {
        "tei": "http://www.tei-c.org/ns/1.0",
        "xml": "http://www.w3.org/XML/1998/namespace",
    }

    def __init__(
        self, remove_spaces: bool = True, strip_namespaces: bool = True
    ) -> None:
        """
        Initialize the parser.

        Args:
            remove_spaces: If True, removes spaces from between <q> tags
                          (preserves original behavior)
            strip_namespaces: If True, removes XML namespaces for easier querying
        """
        self.remove_spaces = remove_spaces
        self.strip_namespaces = strip_namespaces

        # Configure lxml parser with fast settings
        self.parser = etree.XMLParser(
            remove_blank_text=True,  # Remove whitespace between elements
            remove_comments=True,  # Remove comments
            remove_pis=True,  # Remove processing instructions
            huge_tree=True,  # Enable parsing of huge files
            recover=True,  # Recover from parsing errors
        )

    def parse_tei_file(self, file_path: str, doc_id: Optional[str] = None) -> TEIDocument:
        """
        Parse a TEI XML file and return a TEIDocument object.

        Args:
            file_path: Path to the TEI XML file
            doc_id: Optional document ID (defaults to filename)

        Returns:
            TEIDocument object with paragraphs and metadata
        """
        if doc_id is None:
            doc_id = Path(file_path).stem

        # Read file content
        with open(file_path, "r", encoding="utf-8") as f:
            raw_xml = f.read()

        # Optionally strip namespaces for easier querying
        if self.strip_namespaces:
            # Remove namespace declarations
            raw_xml = re.sub(r'xmlns[^=]*="[^"]*"', "", raw_xml)
            raw_xml = re.sub(r'xmlns:xsi[^=]*="[^"]*"', "", raw_xml)

        # Parse with lxml
        try:
            root = etree.fromstring(raw_xml.encode("utf-8"), self.parser)
        except etree.XMLSyntaxError:
            # Try with recovery
            root = etree.fromstring(
                raw_xml.encode("utf-8"), etree.XMLParser(recover=True)
            )

        # Extract metadata
        metadata = self._extract_metadata(root, file_path)

        # Build paragraphs
        paragraphs = self._build_paragraphs(root, doc_id)

        return TEIDocument(
            doc_id=doc_id,
            paragraphs=tuple(paragraphs),
            raw_xml=raw_xml,
            metadata=metadata,
        )

    def _extract_metadata(self, root: etree._Element, file_path: str) -> Dict[str, Any]:
        """Extract metadata from TEI header."""
        metadata = {"source_file": file_path, "title": "", "author": ""}

        # Try to find title (with or without namespace)
        for title_xpath in [
            ".//tei:title",  # With namespace
            ".//title",  # Without namespace
            ".//teiHeader/fileDesc/titleStmt/title",
            ".//{http://www.tei-c.org/ns/1.0}title",
        ]:
            try:
                title_elem = root.find(title_xpath, self.NAMESPACES)
                if title_elem is not None and title_elem.text:
                    metadata["title"] = title_elem.text.strip()
                    break
            except Exception:
                continue

        return metadata

    def _build_paragraphs(
        self, root: etree._Element, doc_id: str
    ) -> List[TEIParagraph]:
        """
        Build paragraph objects from TEI document.

        Args:
            root: lxml root element
            doc_id: Document ID

        Returns:
            List of TEIParagraph objects
        """
        paragraphs = []

        # Collect ALL paragraph-like elements from multiple patterns
        # (don't break after first success - collect from all patterns)
        para_elements = []

        for xpath_pattern in [
            ".//p",  # p tags (most common)
            ".//ab",  # AB tags
            ".//l",  # Line tags
            ".//sp",  # Speech tags
            ".//u",  # Utterance tags
        ]:
            try:
                elements = root.findall(xpath_pattern)
                para_elements.extend(elements)
            except Exception:
                continue

        # Remove duplicates while preserving order
        seen = set()
        unique_elements = []
        for elem in para_elements:
            elem_id = id(elem)
            if elem_id not in seen:
                seen.add(elem_id)
                unique_elements.append(elem)

        para_elements = unique_elements

        for para_idx, para_elem in enumerate(para_elements):
            # Get text content
            text = self._get_element_text(para_elem)

            if not text or not text.strip():
                # Skip empty paragraphs
                continue

            # Extract speech spans from within the paragraph element
            gold_spans = self._extract_speech_spans(para_elem, text)

            # Also extract speech from adjacent <quote> elements (novel-dialogism format)
            # This modifies the text to include speech from adjacent quotes
            quote_spans, extended_text = self._extract_speech_from_adjacent_quotes(para_elem, text)

            # Use extended text if speech was found
            final_text = extended_text if extended_text else text
            final_spans = gold_spans + quote_spans if quote_spans else gold_spans

            # Tokenize and create BIO labels
            tokens = final_text.split()
            bio_labels = self._create_bio_labels(tokens, final_spans, final_text)

            para_id = f"{doc_id}_para{para_idx}"

            paragraphs.append(
                TEIParagraph(
                    doc_id=doc_id,
                    para_id=para_id,
                    text=final_text,
                    tokens=tokens,
                    bio_labels=bio_labels,
                )
            )

        return paragraphs

    def _extract_speech_from_adjacent_quotes(
        self, para_element: etree._Element, para_text: str
    ) -> Tuple[List[Tuple[int, int, str]], str]:
        """
        Extract speech from adjacent <quote> elements (novel-dialogism format).

        In novel-dialogism TEI, <quote> elements contain <s> tags with quoted text.
        These <quote> elements are siblings to <p> elements, not nested within them.
        This method extracts speech from those adjacent <quote> elements and appends
        them to the paragraph text for proper speech detection.

        Args:
            para_element: Paragraph lxml element
            para_text: Paragraph text content

        Returns:
            Tuple of (gold_spans, extended_text)
            - gold_spans: List of (start_char, end_char, label) tuples
            - extended_text: Paragraph text with speech appended, or None if no speech found
        """
        gold_spans = []
        extended_text = para_text

        # Get the parent of this paragraph element
        parent = para_element.getparent()
        if parent is None:
            return gold_spans, extended_text

        # Find the index of this paragraph in the parent's children
        para_index = None
        for i, child in enumerate(parent):
            if child is para_element:
                para_index = i
                break

        if para_index is None:
            return gold_spans, extended_text

        # Look at the next few siblings to find <quote> elements
        # (speech quotes typically come immediately after the narrative paragraph)
        max_lookahead = 3
        for offset in range(1, max_lookahead + 1):
            sibling_index = para_index + offset
            if sibling_index >= len(parent):
                break

            sibling = parent[sibling_index]
            if sibling.tag != "quote":
                # If we hit a paragraph instead of a quote, we're done
                if sibling.tag == "p":
                    break
                continue

            # Look for <s> tags within the <quote> element
            for s_elem in sibling.iter():
                if s_elem.tag != "s":
                    continue

                # Get the text of this speech element
                speech_text = etree.tostring(s_elem, encoding="unicode", method="text")

                if not speech_text or not speech_text.strip():
                    continue

                speech_text = speech_text.strip()
                speech_text = re.sub(r"\s+", " ", speech_text)

                # Append speech text to paragraph text with spacing
                if extended_text and not extended_text.endswith(" "):
                    extended_text += " "
                start_char = len(extended_text)
                extended_text += speech_text
                end_char = len(extended_text)

                # Get label (default to DIRECT)
                label = s_elem.get("type", "DIRECT").upper()
                gold_spans.append((start_char, end_char, label))

        # Return extended text only if we found speech
        return gold_spans, extended_text if gold_spans else None

    def _get_element_text(self, element: etree._Element) -> str:
        """
        Get text content of an element, handling nested speech tags.

        Args:
            element: lxml element

        Returns:
            Text content with spacing preserved
        """
        # Get all text
        text = etree.tostring(element, encoding="unicode", method="text")

        # Clean up whitespace
        text = text.strip()
        text = re.sub(r"\s+", " ", text)  # Collapse multiple spaces

        return text

    def _extract_speech_spans(
        self, para_element: etree._Element, para_text: str
    ) -> List[Tuple[int, int, str]]:
        """
        Extract speech spans from a paragraph.

        Args:
            para_element: Paragraph lxml element
            para_text: Paragraph text content

        Returns:
            List of (start_char, end_char, label) tuples
        """
        gold_spans = []

        # Find all speech tags in this paragraph
        # Note: iter() doesn't accept a set, so we iterate all elements and filter
        for elem in para_element.iter():
            if elem.tag not in self.SPEECH_TAGS:
                continue

            speech_tag = elem
            # Get the text of this speech element
            speech_text = etree.tostring(speech_tag, encoding="unicode", method="text")

            if not speech_text or not speech_text.strip():
                continue

            speech_text = speech_text.strip()
            speech_text = re.sub(r"\s+", " ", speech_text)

            # Find position in paragraph text
            start_char = para_text.find(speech_text)
            if start_char == -1:
                # Text not found (might be nested differently)
                continue

            end_char = start_char + len(speech_text)

            # Get label (default to DIRECT)
            label = speech_tag.get("type", "DIRECT").upper()

            gold_spans.append((start_char, end_char, label))

        return gold_spans

    def _create_bio_labels(
        self,
        tokens: List[str],
        gold_spans: List[Tuple[int, int, str]],
        text: str,
    ) -> List[str]:
        """
        Create BIO labels for tokens based on gold spans.

        Args:
            tokens: List of tokens
            gold_spans: List of (start, end, label) tuples
            text: Original text

        Returns:
            List of BIO labels
        """
        # Initialize all labels as O
        bio_labels = ["O"] * len(tokens)

        # Calculate token character offsets
        token_offsets = []
        current_offset = 0
        for token in tokens:
            # Find token in text (handle multiple occurrences)
            token_start = text.find(token, current_offset)
            if token_start == -1:
                # Fallback: use current offset
                token_start = current_offset
            token_end = token_start + len(token)
            token_offsets.append((token_start, token_end))
            current_offset = token_end + 1  # +1 for space

        # Apply BIO labels based on gold spans
        for span_start, span_end, label in gold_spans:
            for token_idx, (token_start, token_end) in enumerate(token_offsets):
                # Check if token overlaps with span
                if not (token_end <= span_start or token_start >= span_end):
                    # Token overlaps with speech span
                    if bio_labels[token_idx] == "O":
                        bio_labels[token_idx] = f"B-{label}"
                    elif bio_labels[token_idx].startswith("B-"):
                        # Continuation of speech
                        bio_labels[token_idx] = f"I-{label}"

        return bio_labels

    def create_tokenized_paragraphs(
        self, document: TEIDocument, tokenizer: Any = None
    ) -> List[Dict[str, Any]]:
        """
        Create tokenized paragraph representations with BIO labels.

        Args:
            document: TEIDocument object
            tokenizer: Optional tokenizer (defaults to whitespace splitting)

        Returns:
            List of paragraph dictionaries with tokens and BIO labels
        """
        tokenized_paragraphs = []

        for para in document.paragraphs:
            # Tokenize (whitespace splitting by default)
            if tokenizer is None:
                tokens = para.text.split()
            else:
                tokens = tokenizer(para.text)

            # Use the pre-computed bio_labels from TEIParagraph
            # These were calculated during _build_paragraphs with proper speech span extraction
            bio_labels = list(para.bio_labels)

            tokenized_paragraphs.append(
                {
                    "doc_id": document.doc_id,
                    "para_id": para.para_id,
                    "tokens": tokens,
                    "bio_labels": bio_labels,
                    "text": para.text,
                }
            )

        return tokenized_paragraphs


def parse_tei_file(file_path: str, doc_id: Optional[str] = None) -> TEIDocument:
    """
    Parse a single TEI file (pure function wrapper).

    Args:
        file_path: Path to TEI XML file
        doc_id: Optional document ID

    Returns:
        TEIDocument object
    """
    parser = TEIParser()
    return parser.parse_tei_file(file_path, doc_id)


def load_corpus(
    file_paths: List[str], doc_ids: Optional[List[str]] = None
) -> List[TEIDocument]:
    """
    Load multiple TEI files into a corpus (pure function wrapper).

    Args:
        file_paths: List of paths to TEI XML files
        doc_ids: Optional list of document IDs (must match length of file_paths)

    Returns:
        List of TEIDocument objects
    """
    if doc_ids is not None and len(doc_ids) != len(file_paths):
        raise ValueError(
            f"doc_ids length {len(doc_ids)} != file_paths length {len(file_paths)}"
        )

    parser = TEIParser()
    documents = []

    for idx, file_path in enumerate(file_paths):
        doc_id = doc_ids[idx] if doc_ids else None
        doc = parser.parse_tei_file(file_path, doc_id)
        documents.append(doc)

    return documents
