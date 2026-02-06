"""CRF model with OCR-robust character n-gram features.

This module implements the traditional ML approach using CRF sequence tagging
with features designed for OCR-robust speech detection.
"""

import os
from typing import Any, Dict, List, Optional, Tuple

import joblib
import sklearn_crfsuite
import spacy
from sklearn.metrics import classification_report
from sklearn_crfsuite import metrics
from tqdm import tqdm

# Import protocol types
from .protocols import CRFConfig, ModelPrediction

# Label encoding constants
LABEL_ENCODING = {
    "O": 0,
    "B-DIRECT": 1,
    "I-DIRECT": 2,
    "B-INDIRECT": 3,
    "I-INDIRECT": 4,
}
LABEL_DECODING = {v: k for k, v in LABEL_ENCODING.items()}


# Speech verbs as immutable frozenset
SPEECH_VERBS = frozenset(
    [
        "say",
        "said",
        "tell",
        "told",
        "ask",
        "asked",
        "reply",
        "replied",
        "answer",
        "answered",
        "exclaim",
        "exclaimed",
        "whisper",
        "whispered",
        "shout",
        "shouted",
        "mutter",
        "muttered",
        "cry",
        "cried",
        "scream",
        "screamed",
        "speak",
        "spoke",
        "spoken",
        "talk",
        "talked",
        "utter",
        "uttered",
        "declare",
        "declared",
        "state",
        "stated",
        "mention",
        "mentioned",
        "add",
        "added",
        "continue",
        "continued",
        "begin",
        "began",
        "go",
        "went",
        "respond",
        "responded",
        "rejoin",
        "rejoined",
        "interrupt",
        "interrupted",
    ]
)


def extract_character_ngrams(word: str, n: int) -> List[str]:
    """Extract character n-grams from a word.

    Args:
        word: The word to extract n-grams from
        n: The n-gram size

    Returns:
        List of character n-grams
    """
    if len(word) < n:
        return [word]

    ngrams = []
    for i in range(len(word) - n + 1):
        ngram = word[i : i + n]
        ngrams.append(ngram)

    return ngrams


def get_word_shape(word: str) -> str:
    """Get the shape of a word (uppercase, lowercase, digits, punctuation).

    Args:
        word: The word to analyze

    Returns:
        String representing the word shape pattern
    """
    if not word:
        return "X"

    shape = []
    for char in word:
        if char.isupper():
            shape.append("X")
        elif char.islower():
            shape.append("x")
        elif char.isdigit():
            shape.append("d")
        elif char.isspace():
            shape.append("s")
        else:
            # Punctuation - normalize quote-like characters
            if char in ['"', "'", "`", '"', '"', "", ""]:
                shape.append("Q")
            else:
                shape.append("p")

    return "".join(shape)


def is_speech_verb(word: str) -> bool:
    """Check if a word is a speech verb (with fuzzy matching for OCR).

    Args:
        word: The word to check

    Returns:
        True if the word is a speech verb
    """
    word_lower = word.lower()

    # Exact match using frozenset
    if word_lower in SPEECH_VERBS:
        return True

    # Fuzzy match for common OCR errors
    if word_lower in {"sa1d", "sald", "sad", "tel1", "te11"}:
        return True

    return False


def extract_token_features(
    tokens: List[str], token_idx: int, config: CRFConfig, prev_para_speech_rate: float = 0.0
) -> Dict[str, Any]:
    """Extract features for a single token at position token_idx.

    Args:
        tokens: List of tokens in the paragraph
        token_idx: Index of the token to extract features for
        config: CRF configuration
        prev_para_speech_rate: Speech rate of previous paragraph

    Returns:
        Dictionary of features for this token
    """
    token = tokens[token_idx]
    features = {}

    # Add bias term
    features["bias"] = "true"

    # Character n-gram features (OCR robust)
    if config.use_speech_verbs:
        for n in range(config.char_ngram_range[0], config.char_ngram_range[1] + 1):
            ngrams = extract_character_ngrams(token, n)
            for i, ngram in enumerate(ngrams):
                if i == 0:
                    features[f"ngram{n}_start"] = ngram
                if i == len(ngrams) - 1:
                    features[f"ngram{n}_end"] = ngram

    # Word shape features
    if config.use_orthographic:
        shape = get_word_shape(token)
        features["shape"] = shape

        # Shape prefixes and suffixes
        if len(shape) >= 2:
            features["shape_prefix2"] = shape[:2]
            features["shape_suffix2"] = shape[-2:]
        if len(shape) >= 3:
            features["shape_prefix3"] = shape[:3]
            features["shape_suffix3"] = shape[-3:]

    # Lexical features
    if config.use_speech_verbs:
        features["word_lower"] = token.lower()
        features["word_len"] = f"len_{min(len(token), 20)}"
        features["is_speech_verb"] = "true" if is_speech_verb(token) else "false"

        # Quote-like character detection
        features["contains_quote"] = (
            "true"
            if any(char in ['"', "'", "`", '"', '"', "", "", "~", "^", "*", "_"] for char in token)
            else "false"
        )

        # Punctuation features
        features["ends_with_punct"] = "true" if (token and token[-1] in [".,;:!?"]) else "false"
        features["starts_with_quote"] = (
            "true"
            if (token and token[0] in ['"', "'", "`", '"', "", "~", "^", "*", "_"])
            else "false"
        )
        features["ends_with_quote"] = (
            "true"
            if (token and token[-1] in ['"', "'", "`", '"', "", "~", "^", "*", "_"])
            else "false"
        )

    # Context window features
    for i in range(1, config.context_window + 1):
        if token_idx - i >= 0:
            prev_token = tokens[token_idx - i]
            prev_shape = get_word_shape(prev_token)
            features[f"prev{i}_shape"] = prev_shape
            features[f"prev{i}_word_lower"] = prev_token.lower()

            # Previous token n-grams
            for n in range(2, 4):  # Just 2-3 grams for context
                prev_ngrams = extract_character_ngrams(prev_token, n)
                if prev_ngrams:
                    features[f"prev{i}_ngram{n}_end"] = prev_ngrams[-1]

        if token_idx + i < len(tokens):
            next_token = tokens[token_idx + i]
            next_shape = get_word_shape(next_token)
            features[f"next{i}_shape"] = next_shape
            features[f"next{i}_word_lower"] = next_token.lower()

            # Next token n-grams
            for n in range(2, 4):  # Just 2-3 grams for context
                next_ngrams = extract_character_ngrams(next_token, n)
                if next_ngrams:
                    features[f"next{i}_ngram{n}_start"] = next_ngrams[0]

    # Paragraph boundary features
    speech_rate_bin = int(prev_para_speech_rate * 5)  # Convert to 0-5 bins
    features["prev_para_speech_rate"] = f"speech_rate_{speech_rate_bin}"

    # Position features
    features["token_position"] = f"pos_{min(token_idx, 20)}"
    features["is_first_token"] = "true" if token_idx == 0 else "false"
    features["is_last_token"] = "true" if token_idx == len(tokens) - 1 else "false"

    return features


def create_feature_matrix(
    tokens: List[str], bio_labels: List[str], config: CRFConfig, prev_para_speech_rate: float = 0.0
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Extract features for all tokens in a paragraph.

    Args:
        tokens: List of tokens in the paragraph
        bio_labels: List of BIO labels for each token
        config: CRF configuration
        prev_para_speech_rate: Speech rate of previous paragraph

    Returns:
        Tuple of (X, y) where X is feature matrix and y is labels
    """
    X = []
    y = []

    for i, _token in enumerate(tokens):
        features = extract_token_features(tokens, i, config, prev_para_speech_rate)
        X.append(features)
        y.append(bio_labels[i])

    return X, y


def calculate_paragraph_speech_rate(bio_labels: List[str]) -> float:
    """Calculate the speech rate for a paragraph (fraction of speech tokens).

    Args:
        bio_labels: List of BIO labels

    Returns:
        Fraction of tokens that are speech labels
    """
    # Handle numpy arrays
    if hasattr(bio_labels, "tolist"):
        bio_labels = list(bio_labels)
    elif hasattr(bio_labels, "shape"):
        bio_labels = list(bio_labels)

    if not bio_labels or len(bio_labels) == 0:
        return 0.0

    speech_tokens = sum(
        1 for label in bio_labels if label in ("B-DIRECT", "I-DIRECT", "B-INDIRECT", "I-INDIRECT")
    )
    return speech_tokens / len(bio_labels)


class CRFModel:
    """CRF model for speech detection with character n-gram features."""

    def __init__(self, config: Optional[CRFConfig] = None):
        """Initialize the CRF model.

        Args:
            config: CRF configuration (uses defaults if not provided)
        """
        self.crf_model = None
        self.config = config or CRFConfig()
        self.nlp = spacy.load("en_core_web_sm")

    def prepare_training_data(
        self, data: List[Dict[str, Any]]
    ) -> Tuple[List[List[Dict[str, Any]]], List[List[str]]]:
        """Prepare training data from tokenized paragraphs.

        Args:
            data: List of tokenized paragraphs with 'tokens' and 'bio_labels' keys

        Returns:
            Tuple of (X_seq, y_seq) where:
                X_seq: List of feature matrices (one per paragraph)
                y_seq: List of label sequences (one per paragraph)
        """
        all_X = []
        all_y = []

        prev_para_speech_rate = 0.0

        for para in tqdm(data, desc="Preparing training data"):
            tokens = para["tokens"]
            bio_labels = para["bio_labels"]

            # Calculate speech rate for this paragraph
            current_speech_rate = calculate_paragraph_speech_rate(bio_labels)

            # Extract features for this paragraph
            X_para, y_para = create_feature_matrix(
                tokens, bio_labels, self.config, prev_para_speech_rate
            )

            # CRF expects list of sequences, not flattened list
            all_X.append(X_para)
            all_y.append(y_para)

            # Update previous paragraph speech rate
            prev_para_speech_rate = current_speech_rate

        return all_X, all_y

    def train(
        self, train_data: List[Dict[str, Any]], val_data: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Train the CRF model.

        Args:
            train_data: Training paragraphs with tokens and labels
            val_data: Optional validation paragraphs (not used by CRF)
        """
        # Prepare training data
        X_train, y_train = self.prepare_training_data(train_data)

        # Initialize CRF model
        crf = sklearn_crfsuite.CRF(
            algorithm="lbfgs",
            c1=self.config.c1,
            c2=self.config.c2,
            max_iterations=self.config.max_iterations,
            all_possible_transitions=self.config.all_possible_transitions,
            all_possible_states=self.config.all_possible_states,
            verbose=False,
        )

        # Train model
        crf.fit(X_train, y_train)
        self.crf_model = crf

    def predict_paragraphs(self, data: List[Dict[str, Any]]) -> List[ModelPrediction]:
        """Predict speech labels for paragraphs.

        Args:
            data: List of tokenized paragraphs

        Returns:
            List of ModelPrediction objects
        """
        if self.crf_model is None:
            raise ValueError("Model has not been trained yet.")

        predictions = []
        prev_para_speech_rate = 0.0

        for para in data:
            tokens = para["tokens"]

            # Extract features for this paragraph
            X_para, _ = create_feature_matrix(
                tokens, ["O"] * len(tokens), self.config, prev_para_speech_rate
            )

            # Predict labels
            bio_labels = self.crf_model.predict([X_para])[0]

            # Ensure it's a Python list (not numpy array)
            if hasattr(bio_labels, "tolist"):
                bio_labels = list(bio_labels)
            elif not isinstance(bio_labels, list):
                bio_labels = list(bio_labels)

            # Calculate speech rate for next paragraph
            current_speech_rate = calculate_paragraph_speech_rate(bio_labels)
            prev_para_speech_rate = current_speech_rate

            # Create prediction result
            prediction = ModelPrediction(
                doc_id=para.get("doc_id", "unknown"),
                para_id=para.get("para_id", "unknown"),
                tokens=tokens,
                predicted_bio_labels=bio_labels,
                text=para.get("text", ""),
            )

            predictions.append(prediction)

        return predictions

    def evaluate(
        self, X_test: List[List[Dict[str, Any]]], y_test: List[List[str]]
    ) -> Dict[str, Any]:
        """Evaluate the CRF model.

        Args:
            X_test: Test feature matrices
            y_test: Test labels

        Returns:
            Dictionary with classification metrics
        """
        if self.crf_model is None:
            raise ValueError("Model has not been trained yet.")

        # Predict labels
        y_pred = self.crf_model.predict(X_test)

        # Flatten for sklearn metrics
        y_test_flat = [label for seq in y_test for label in seq]
        y_pred_flat = [label for seq in y_pred for label in seq]

        # Convert to numerical format
        y_test_encoded = [LABEL_ENCODING[label] for label in y_test_flat]
        y_pred_encoded = [LABEL_ENCODING[label] for label in y_pred_flat]

        # Calculate metrics
        report = classification_report(
            y_test_encoded,
            y_pred_encoded,
            target_names=list(LABEL_ENCODING.keys()),
            output_dict=True,
        )

        # Calculate CRF-specific metrics
        sorted_labels = sorted(LABEL_ENCODING.keys())
        crf_metrics = metrics.flat_classification_report(
            y_test, y_pred, labels=sorted_labels, digits=4
        )

        return {"classification_report": report, "crf_metrics": crf_metrics}

    def save_model(self, file_path: str) -> None:
        """Save the trained CRF model to file.

        Args:
            file_path: Path to save the model
        """
        if self.crf_model is None:
            raise ValueError("Model has not been trained yet.")

        # Create directory if it doesn't exist
        if file_path and os.path.dirname(file_path):
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Save model and config
        model_data = {"crf_model": self.crf_model, "config": self.config}

        joblib.dump(model_data, file_path)

    def load_model(self, file_path: str) -> None:
        """Load a trained CRF model from file.

        Args:
            file_path: Path to load the model from
        """
        model_data = joblib.load(file_path)

        self.crf_model = model_data["crf_model"]
        if "config" in model_data:
            self.config = model_data["config"]

    def get_feature_importance(self, top_n: int = 20) -> List[Tuple[str, float]]:
        """Get the most important features from the trained model.

        Args:
            top_n: Number of top features to return

        Returns:
            List of (feature, weight) tuples sorted by absolute weight
        """
        if self.crf_model is None:
            raise ValueError("Model has not been trained yet.")

        # Get state features
        state_features = self.crf_model.state_features_

        # Sort by absolute weight
        sorted_features = sorted(state_features.items(), key=lambda x: abs(x[1]), reverse=True)[
            :top_n
        ]

        return sorted_features
