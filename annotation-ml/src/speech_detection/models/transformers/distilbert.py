"""DistilBERT model for fast speech detection baseline.

This module implements a lighter, faster transformer baseline using DistilBERT
with shorter sequences (512 tokens) and dynamic padding.
"""

from typing import Any, Dict, List, Optional, cast

import torch
from torch.utils.data import DataLoader
from tqdm import tqdm
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)

# Import protocol types
from ..protocols import DistilBERTConfig, ModelPrediction

# Import shared utilities
from .base import LABEL_DECODING, SpeechDataset, compute_metrics


class DistilBERTModel:
    """DistilBERT model for speech detection - fast baseline.

    This model provides a good balance between speed and accuracy for
    speech detection tasks.
    """

    def __init__(self, config: Optional[DistilBERTConfig] = None):
        """Initialize the DistilBERT model.

        Args:
            config: DistilBERT configuration (uses defaults if not provided)
        """
        self.config = config or DistilBERTConfig()
        self.model_name = self.config.model_name
        self.max_length = self.config.max_length
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        print(f"Initializing DistilBERT model: {self.model_name}")

        # Initialize tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

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
            cast(Any, self.tokenizer),  # type: ignore[arg-type]  # type: ignore[arg-type]
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
            tokenizer=self.tokenizer,  # type: ignore[call-arg]
            padding=True,  # Dynamic padding (pad to longest in batch)
            pad_to_multiple_of=None,
        )

        # Training arguments with optimizations
        training_args = TrainingArguments(
            output_dir="./distilbert_results",
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

    def predict_paragraphs(self, data: List[Dict[str, Any]]) -> List[ModelPrediction]:
        """Predict speech labels for paragraphs.

        Args:
            data: List of tokenized paragraphs

        Returns:
            List of ModelPrediction objects
        """
        self.model.eval()

        dataset = SpeechDataset(data, self.tokenizer, self.max_length)  # type: ignore[arg-type]

        # Data collator for dynamic padding
        data_collator = DataCollatorForTokenClassification(tokenizer=self.tokenizer, padding=True)

        loader = DataLoader(
            dataset,
            batch_size=self.config.batch_size,
            shuffle=False,
            collate_fn=data_collator,
            num_workers=4,
            pin_memory=True,
        )

        predictions: List[ModelPrediction] = []

        with torch.no_grad():
            for batch in tqdm(loader, desc="Predicting"):
                input_ids = batch["input_ids"].to(self.device)
                attention_mask = batch["attention_mask"].to(self.device)

                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                logits = outputs.logits

                # Get predictions
                batch_predictions = torch.argmax(logits, dim=-1)

                # Convert to labels for each sample in batch
                for i in range(len(batch["input_ids"])):
                    # Get metadata from cache
                    sample_idx = len(predictions)
                    metadata = dataset._metadata[sample_idx]
                    text = metadata["text"]
                    original_labels = metadata["original_labels"]
                    doc_id = metadata["doc_id"]
                    para_id = metadata["para_id"]

                    # Tokenize again to get word_ids
                    encoding = self.tokenizer(text, return_offsets_mapping=False)
                    word_ids = encoding.word_ids(batch_index=0)

                    # Convert predictions to word-level BIO labels
                    # Fixed: Use seen_word_indices to handle subword aggregation correctly
                    predicted_bio_labels = []
                    seen_word_indices = set()

                    for word_idx, pred_label in zip(word_ids, batch_predictions[i], strict=True):
                        if word_idx is None:
                            continue  # Skip special tokens
                        elif word_idx < len(original_labels):
                            # Only use first token of each word
                            if word_idx not in seen_word_indices:
                                seen_word_indices.add(word_idx)
                                label_int = pred_label.item()
                                label_str = LABEL_DECODING.get(label_int, "O")
                                predicted_bio_labels.append(label_str)

                    # Pad if needed (shouldn't happen, but just in case)
                    while len(predicted_bio_labels) < len(original_labels):
                        predicted_bio_labels.append("O")

                    predictions.append(
                        ModelPrediction(
                            doc_id=doc_id,
                            para_id=para_id,
                            tokens=data[len(predictions)]["tokens"],
                            predicted_bio_labels=predicted_bio_labels,
                            text=text,
                        )
                    )

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
            Loaded DistilBERTModel instance
        """
        import json
        from pathlib import Path

        model_dir = Path(model_path)

        # Load config
        config_path = model_dir / "config.json"
        if config_path.exists():
            with open(config_path, "r") as f:
                config_dict = json.load(f)
            config = DistilBERTConfig(**config_dict)
        else:
            config = DistilBERTConfig()

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
