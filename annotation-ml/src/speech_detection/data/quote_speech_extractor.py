"""Quote-based speech extraction for dialogue detection.

This module provides functionality to detect dialogue speech by identifying
text between quotation marks, as opposed to TEI annotation-based detection.
"""

import re
from typing import List, Tuple, Dict, Any
from lxml import etree


class QuoteBasedSpeechExtractor:
    """Extract speech by detecting text between quotation marks.

    This extractor identifies dialogue by finding text between quote
    characters (straight quotes: ", curly quotes: " ", ', ', etc.).

    Example:
        >>> extractor = QuoteBasedSpeechExtractor()
        >>> text = 'He said "hello world" to me.'
        >>> tokens, labels = extractor.extract_speech(text)
        >>> labels
        ['O', 'O', 'O', 'B-DIRECT', 'I-DIRECT', 'O', 'O', 'O']
    """

    # Quote characters (using Unicode escapes for smart quotes)
    OPENING_QUOTES = {'"', '\u201c', '\u2018', '`'}
    CLOSING_QUOTES = {'"', '\u201d', '\u2019', '`'}

    def __init__(self, include_speaker_tags: bool = False):
        """Initialize the quote-based extractor.

        Args:
            include_speaker_tags: If True, include speaker attribution tags
        """
        self.include_speaker_tags = include_speaker_tags

    def extract_speech_from_text(
        self,
        text: str
    ) -> List[Tuple[int, int, str]]:
        """Extract speech spans from text by finding quoted passages.

        Args:
            text: Input text

        Returns:
            List of (start_char, end_char, label) tuples for speech spans
        """
        spans = []
        in_quote = False
        quote_start = 0
        quote_char = None
        i = 0

        while i < len(text):
            char = text[i]

            # Check if this is a quote character
            if char in self.OPENING_QUOTES:
                if not in_quote:
                    # Start of quoted speech
                    in_quote = True
                    quote_start = i + 1  # Start after the quote mark
                    quote_char = char
                elif char == quote_char:
                    # End of quoted speech
                    spans.append((quote_start, i, 'DIRECT'))
                    in_quote = False
                    quote_char = None

            i += 1

        return spans

    def is_apostrophe(self, text: str, pos: int) -> bool:
        """Check if a quote character is an apostrophe.

        Apostrophes occur within words (don't, can't, John's) while
        quote delimiters occur at word boundaries.

        Args:
            text: Full text
            pos: Position of quote character

        Returns:
            True if this is an apostrophe, False if it's a quote delimiter
        """
        if pos >= len(text):
            return False

        char = text[pos]
        if char not in {"'", '\u2019'}:
            return False

        # Check if surrounded by letters (apostrophe pattern)
        if pos > 0 and pos < len(text) - 1:
            prev_char = text[pos - 1]
            next_char = text[pos + 1]

            # Pattern like s' (John's) or 't (don't)
            if prev_char.isalpha() and (next_char.isalpha() or next_char == 's'):
                return True

        return False

    def create_bio_labels(
        self,
        text: str,
        tokens: List[str],
        speech_spans: List[Tuple[int, int, str]] = None
    ) -> List[str]:
        """Create BIO labels for tokens based on quote-based speech detection.

        Args:
            text: Full paragraph text
            tokens: List of tokens
            speech_spans: Optional pre-computed speech spans

        Returns:
            List of BIO labels (same length as tokens)
        """
        if speech_spans is None:
            speech_spans = self.extract_speech_from_text(text)

        # Build token character offsets
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

        # Initialize all labels as O
        bio_labels = ['O'] * len(tokens)

        # Apply BIO labels based on speech spans
        for span_start, span_end, label in speech_spans:
            first_content = True

            for token_idx, (token_start, token_end) in enumerate(token_offsets):
                # Check if token overlaps with speech span
                if not (token_end <= span_start or token_start >= span_end):
                    # Token is within speech span
                    # Skip if it's just a quote character
                    if tokens[token_idx] in self.OPENING_QUOTES:
                        continue

                    if first_content:
                        bio_labels[token_idx] = f'B-{label}'
                        first_content = False
                    else:
                        bio_labels[token_idx] = f'I-{label}'

        return bio_labels


def extract_quote_speech_from_tei(
    tei_file: str,
    extractor: QuoteBasedSpeechExtractor = None
) -> List[Dict[str, Any]]:
    """Extract quote-based speech annotations from a TEI XML file.

    Args:
        tei_file: Path to TEI XML file
        extractor: Optional QuoteBasedSpeechExtractor instance

    Returns:
        List of paragraph dictionaries with quote-based BIO labels
    """
    if extractor is None:
        extractor = QuoteBasedSpeechExtractor()

    # Parse TEI file
    tree = etree.parse(tei_file)
    root = tree.getroot()

    # Namespace
    ns = {'tei': 'http://www.tei-c.org/ns/1.0'}

    paragraphs = []

    # Find all paragraph elements
    for p_elem in root.findall('.//tei:p', ns):
        # Get text content
        text = etree.tostring(p_elem, encoding='unicode', method='text')

        if not text or not text.strip():
            continue

        # Tokenize
        tokens = text.split()

        # Create quote-based BIO labels
        bio_labels = extractor.create_bio_labels(text, tokens)

        # Get doc_id from filename
        import os
        doc_id = os.path.splitext(os.path.basename(tei_file))[0]

        paragraphs.append({
            'doc_id': doc_id,
            'para_id': f"{doc_id}_para{len(paragraphs)}",
            'text': text,
            'tokens': tokens,
            'bio_labels': bio_labels,
        })

    return paragraphs
