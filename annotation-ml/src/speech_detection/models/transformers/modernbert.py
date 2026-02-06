"""ModernBERT model for speech detection with long context.

This module implements the transformer approach using ModernBERT with
long context windows (4096 tokens) and overlapping inference.
"""

from typing import Any, Dict, List, Optional, Tuple, cast

import torch
from tqdm import tqdm
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

# Import protocol types
from ..protocols import ModelPrediction, ModernBERTConfig

# Import shared utilities
from .base import LABEL_DECODING, SpeechDataset, compute_metrics


class ModernBERTModel:
    """ModernBERT model for speech detection with long context.

    This model handles longer sequences (up to 4096 tokens) making it
    suitable for processing entire paragraphs or documents in a single pass.
    """

    def __init__(self, config: Optional[ModernBERTConfig] = None):
        """Initialize the ModernBERT model.

        Args:
            config: ModernBERT configuration (uses defaults if not provided)
        """
        self.config = config or ModernBERTConfig()
        self.model_name = self.config.model_name
        self.max_length = self.config.max_length
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print(f"Initializing ModernBERT model: {self.model_name}")

        # Initialize tokenizer with critical fix for token alignment
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            add_prefix_space=True,  # Essential for correct subword alignment
        )

        # Initialize model
        self.model = AutoModelForTokenClassification.from_pretrained(
            self.model_name, num_labels=self.config.num_labels, ignore_mismatched_sizes=True
        ).to(self.device)

        print(f"Device: {self.device}")
        print(f"Max length: {self.max_length}")
        print(f"Parameters: {sum(p.numel() for p in self.model.parameters()):,}")

    def prepare_training_data(self, data: List[Dict[str, Any]]) -> tuple:
        """Prepare training data (not used by transformer models).

        This method is kept for protocol compatibility but transformers
        handle data preparation internally through the Dataset class.

        Args:
            data: List of tokenized paragraphs

        Returns:
            Placeholder tuple (not used)
        """
        # Transformers handle data preparation internally
        return ([], [])

    def train(
        self, train_data: List[Dict[str, Any]], val_data: Optional[List[Dict[str, Any]]] = None
    ) -> None:
        """Train the model using Hugging Face Trainer.

        Args:
            train_data: Training paragraphs
            val_data: Optional validation paragraphs
        """
        # Create datasets
        train_dataset = SpeechDataset(
            train_data,
            cast(Any, self.tokenizer),  # type: ignore[arg-type]
            self.max_length,
        )
        val_dataset = None
        if val_data:
            val_dataset = SpeechDataset(
                val_data,
                cast(Any, self.tokenizer),  # type: ignore[arg-type]
                self.max_length,
            )

        # Store reference for later use in prediction
        self.train_dataset = train_dataset

        # Data collator for dynamic padding
        data_collator = DataCollatorForTokenClassification(
            tokenizer=self.tokenizer, padding=True, pad_to_multiple_of=None
        )

        # Training arguments with optimizations
        training_args = TrainingArguments(
            output_dir="./modernbert_results",
            num_train_epochs=self.config.epochs,
            per_device_train_batch_size=self.config.batch_size,
            per_device_eval_batch_size=self.config.batch_size * 2
            if val_dataset
            else self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            # Optimizations
            bf16=self.config.bf16,
            gradient_checkpointing=False,
            dataloader_num_workers=4,
            dataloader_pin_memory=True,
            # Logging and evaluation
            logging_steps=100,
            eval_strategy="epoch" if val_dataset else "no",  # Fixed: use eval_strategy
            save_strategy="no",
            report_to="none",
            learning_rate=self.config.learning_rate,
            warmup_steps=self.config.warmup_steps,
            weight_decay=0.01,
            # Performance
            max_grad_norm=1.0,
            load_best_model_at_end=False,
            metric_for_best_model="f1",
        )

        # Initialize Trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            data_collator=data_collator,
            compute_metrics=cast(Any, compute_metrics) if val_dataset else None,  # type: ignore[arg-type]
            # tokenizer=self.tokenizer,  # type: ignore[call-arg]
        )

        # Train
        print("\nTraining with Trainer API...")
        print(f"  Epochs: {self.config.epochs}")
        print(f"  Batch size: {self.config.batch_size}")
        print(f"  Training samples: {len(train_dataset)}")
        print(f"  Mixed precision (BF16): {self.config.bf16}")
        print(f"  Gradient accumulation: {self.config.gradient_accumulation_steps}")

        if val_dataset:
            print(f"  Validation samples: {len(val_dataset)}")

        train_result = trainer.train()

        print("\nTraining completed!")
        print(f"  Final training loss: {train_result.training_loss:.4f}")

        # Print final metrics if validation was used
        if val_dataset:
            metrics = trainer.evaluate()
            print("\nFinal Validation Metrics:")
            print(f"  F1:        {metrics.get('eval_f1', 0):.4f}")
            print(f"  Precision: {metrics.get('eval_precision', 0):.4f}")
            print(f"  Recall:    {metrics.get('eval_recall', 0):.4f}")

    def predict(self, text: str, window_size: int = 4096, stride: int = 3072) -> Dict[str, Any]:
        """Predict speech labels for a text using overlapping windows.

        Args:
            text: Input text to predict
            window_size: Size of each window for long texts
            stride: Stride between windows

        Returns:
            Dictionary with tokens, labels, and confidences
        """
        # Tokenize the text
        tokens = self.tokenizer(
            text, return_tensors="pt", return_offsets_mapping=True, return_attention_mask=True
        )

        input_ids = tokens["input_ids"].squeeze().tolist()
        attention_mask = tokens["attention_mask"].squeeze().tolist()
        offsets = tokens["offset_mapping"].squeeze().tolist()

        # If text is short enough, predict directly
        if len(input_ids) <= window_size:
            return self._predict_single_window(input_ids, attention_mask, offsets)

        # Otherwise, use overlapping windows
        return self._predict_with_overlapping_windows(
            input_ids, attention_mask, offsets, window_size, stride
        )

    def _predict_single_window(
        self, input_ids: List[int], attention_mask: List[int], offsets: List[Tuple[int, int]]
    ) -> Dict[str, Any]:
        """Predict labels for a single window.

        Args:
            input_ids: Token IDs
            attention_mask: Attention mask
            offsets: Character offsets for each token

        Returns:
            Dictionary with predictions
        """
        # Convert to tensors and move to device
        input_ids_tensor = torch.tensor([input_ids]).to(self.device)
        attention_mask_tensor = torch.tensor([attention_mask]).to(self.device)

        # Predict
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids_tensor, attention_mask=attention_mask_tensor)

        # Get predictions
        logits = outputs.logits
        predictions = torch.argmax(logits, dim=-1).squeeze().tolist()

        # Convert to labels and filter out special tokens
        labels = []
        token_texts = []
        confidences = []

        for i, (pred_id, (_start, _end)) in enumerate(zip(predictions, offsets, strict=True)):
            if pred_id == -100:  # Skip special tokens
                continue

            label = LABEL_DECODING.get(pred_id, "O")
            token_text = self.tokenizer.decode(input_ids[i])

            # Get confidence (softmax probability)
            probs = torch.softmax(logits[0][i], dim=-1)
            confidence = probs[pred_id].item()

            labels.append(label)
            token_texts.append(token_text)
            confidences.append(confidence)

        return {
            "tokens": token_texts,
            "labels": labels,
            "confidences": confidences,
            "text": self.tokenizer.decode(input_ids),
        }

    def _predict_with_overlapping_windows(
        self,
        input_ids: List[int],
        attention_mask: List[int],
        offsets: List[Tuple[int, int]],
        window_size: int,
        stride: int,
    ) -> Dict[str, Any]:
        """Predict labels using overlapping windows for long texts.

        Args:
            input_ids: Token IDs
            attention_mask: Attention mask
            offsets: Character offsets
            window_size: Size of each window
            stride: Stride between windows

        Returns:
            Dictionary with merged predictions
        """
        # Split into overlapping windows
        windows = []
        window_starts = list(range(0, len(input_ids), stride))

        # Make sure the last window includes the end
        if window_starts[-1] + window_size > len(input_ids):
            window_starts[-1] = max(0, len(input_ids) - window_size)

        for start in window_starts:
            end = min(start + window_size, len(input_ids))
            windows.append((start, end))

        # Predict each window
        window_predictions = []

        for window_idx, (start, end) in enumerate(windows):
            window_input_ids = input_ids[start:end]
            window_attention_mask = attention_mask[start:end]
            window_offsets = offsets[start:end]

            # Pad if necessary
            if len(window_input_ids) < window_size:
                padding = window_size - len(window_input_ids)
                window_input_ids += [self.tokenizer.pad_token_id] * padding
                window_attention_mask += [0] * padding

            # Predict this window
            result = self._predict_single_window(
                window_input_ids, window_attention_mask, window_offsets
            )

            # Store window position
            result["window_start"] = start
            result["window_end"] = end
            result["window_idx"] = window_idx

            window_predictions.append(result)

        # Merge window predictions
        all_tokens = []
        all_labels = []
        all_confidences = []

        for window_pred in window_predictions:
            window_start = window_pred["window_start"]

            # Get the original offsets for this window
            original_window_offsets = offsets[window_start : window_pred["window_end"]]

            # Filter out padding and special tokens
            valid_predictions = []
            for i, (label, token, confidence) in enumerate(
                zip(
                    window_pred["labels"],
                    window_pred["tokens"],
                    window_pred["confidences"],
                    strict=True,
                )
            ):
                if i < len(original_window_offsets):
                    valid_predictions.append((label, token, confidence, original_window_offsets[i]))

            # Add valid predictions
            for label, token, confidence, (_char_start, _char_end) in valid_predictions:
                all_tokens.append(token)
                all_labels.append(label)
                all_confidences.append(confidence)

        return {
            "tokens": all_tokens,
            "labels": all_labels,
            "confidences": all_confidences,
            "text": self.tokenizer.decode(input_ids),
            "num_windows": len(windows),
        }

    def predict_paragraphs(
        self, data: List[Dict[str, Any]], window_size: int = 4096, stride: int = 3072
    ) -> List[ModelPrediction]:
        """Predict speech labels for multiple paragraphs.

        Args:
            data: List of tokenized paragraphs
            window_size: Size of each window for long texts
            stride: Stride between windows

        Returns:
            List of ModelPrediction objects
        """
        predictions = []

        for para in tqdm(data, desc="Predicting paragraphs"):
            text = para["text"]

            # Predict using overlapping windows
            result = self.predict(text, window_size=window_size, stride=stride)

            # Create ModelPrediction object
            prediction = ModelPrediction(
                doc_id=para.get("doc_id", "unknown"),
                para_id=para.get("para_id", "unknown"),
                tokens=result["tokens"],
                predicted_bio_labels=result["labels"],
                text=text,
            )

            predictions.append(prediction)

        return predictions

    def save_model(self, model_path: str) -> None:
        """Save the trained model to disk.

        Args:
            model_path: Path to save the model (directory)
        """
        from pathlib import Path

        model_dir = Path(model_path)
        model_dir.mkdir(parents=True, exist_ok=True)

        # Save model and tokenizer
        self.model.save_pretrained(model_dir)
        self.tokenizer.save_pretrained(model_dir)

        # Save config
        import json

        config_path = model_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(
                {
                    "model_name": self.model_name,
                    "max_length": self.max_length,
                    "num_labels": self.config.num_labels,
                    "batch_size": self.config.batch_size,
                    "epochs": self.config.epochs,
                    "learning_rate": self.config.learning_rate,
                    "bf16": self.config.bf16,
                },
                f,
                indent=2,
            )

        print(f"Model saved to {model_dir}")

    @classmethod
    def load_model(cls, model_path: str):
        """Load a trained model from disk.

        Args:
            model_path: Path to the saved model directory

        Returns:
            Loaded ModernBERTModel instance
        """
        import json
        from pathlib import Path

        model_dir = Path(model_path)

        # Load config
        config_path = model_dir / "config.json"
        if config_path.exists():
            with open(config_path, "r") as f:
                config_dict = json.load(f)
            config = ModernBERTConfig(**config_dict)
        else:
            config = ModernBERTConfig()

        # Create model instance
        instance = cls(config)

        # Load trained weights and tokenizer
        instance.model = AutoModelForTokenClassification.from_pretrained(
            model_dir,
            ignore_mismatched_sizes=True,  # Handle vocab size mismatch
        ).to(instance.device)
        instance.tokenizer = AutoTokenizer.from_pretrained(model_dir)

        print(f"Model loaded from {model_dir}")
        return instance
