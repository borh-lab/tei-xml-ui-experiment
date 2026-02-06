#!/usr/bin/env python3
"""Unified CLI for speech detection in TEI XML documents."""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import click
import yaml

from speech_detection.data import TEIParser


# Lazy imports for heavy dependencies (torch/transformers only when needed)
def get_crf_model():
    from speech_detection.models import CRFConfig, CRFModel

    return CRFModel, CRFConfig


def get_transformer_models():
    from speech_detection.models import (
        DistilBERTConfig,
        DistilBERTModel,
        ModernBERTConfig,
        ModernBERTModel,
    )

    return DistilBERTModel, DistilBERTConfig, ModernBERTModel, ModernBERTConfig


def get_evaluation():
    from speech_detection.evaluation import (
        EvaluationConfig,
        evaluate_model_with_cv,
        format_results,
    )

    return EvaluationConfig, evaluate_model_with_cv, format_results


def merge_dicts(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries.

    Args:
        base: Base dictionary
        override: Dictionary with override values

    Returns:
        Merged dictionary
    """
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    return result


def load_config(config_path: str) -> Dict[str, Any]:
    """Load YAML configuration file.

    Args:
        config_path: Path to YAML config file

    Returns:
        Configuration dictionary
    """
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


@click.group()
@click.version_option(version="0.1.0")
def cli():
    """Speech detection in TEI XML documents.

    Train and evaluate models for detecting speech in TEI XML documents.
    """
    pass


@cli.command()
@click.option(
    "--config", type=click.Path(exists=True), required=True, help="Path to YAML configuration file"
)
@click.option("--jobs", type=int, default=None, help="Number of parallel jobs (overrides config)")
@click.option("--folds", type=int, default=None, help="Number of CV folds (overrides config)")
@click.option(
    "--bootstrap", type=int, default=None, help="Number of bootstrap samples (overrides config)"
)
@click.option("--use-splits", is_flag=True, help="Use splits.json for train/validation/test splits")
@click.option(
    "--splits-path", type=str, default="../datasets/splits.json", help="Path to splits.json file"
)
@click.option(
    "--save-model",
    type=str,
    default=None,
    help="Path to save trained model (e.g., models/crf_model.pkl)",
)
def train_crf(
    config: str,
    jobs: Optional[int],
    folds: Optional[int],
    bootstrap: Optional[int],
    use_splits: bool,
    splits_path: str,
    save_model: Optional[str],
):
    """Train CRF model with cross-validation."""
    click.echo("Loading configuration...")
    cfg = load_config(config)

    # Apply CLI overrides
    if "training" not in cfg:
        cfg["training"] = {}
    if jobs is not None:
        cfg["training"]["n_jobs"] = jobs
    if folds is not None:
        cfg["training"]["n_folds"] = folds
    if bootstrap is not None:
        cfg["training"]["n_bootstrap"] = bootstrap

    # Initialize model
    click.echo("Initializing CRF model...")
    crf_model_class, crf_config_class = get_crf_model()
    model_config = crf_config_class(**cfg.get("model", {}))
    model = crf_model_class(model_config)

    # Load data
    if use_splits:
        click.echo(f"Loading data using splits from {splits_path}...")
        from speech_detection.data.splits import get_split_info, load_split_data

        split_info = get_split_info(splits_path)
        click.echo(f"Split info: {split_info}")

        max_docs = cfg["data"].get("max_docs")

        # Load training data from splits
        parser = TEIParser()
        data = load_split_data("train", splits_path, "..", max_docs, parser)
        click.echo(f"Loaded {len(data)} paragraphs from train split")
    else:
        click.echo(f"Loading corpus from {cfg['data']['corpus_dir']}...")
        corpus_dir = cfg["data"]["corpus_dir"]
        max_docs = cfg["data"].get("max_docs")

        # Load TEI files
        parser = TEIParser()
        corpus_path = Path(corpus_dir)
        tei_files = (
            list(corpus_path.glob("*.xml"))[:max_docs]
            if max_docs
            else list(corpus_path.glob("*.xml"))
        )

        if not tei_files:
            click.echo(f"Error: No TEI files found in {corpus_dir}", err=True)
            sys.exit(1)

        click.echo(f"Found {len(tei_files)} documents")

        # Parse documents
        data = []
        for i, tei_file in enumerate(tei_files):
            doc = parser.parse_tei_file(str(tei_file), tei_file.stem)
            paras = parser.create_tokenized_paragraphs(doc)
            data.extend(paras)
            if (i + 1) % 10 == 0:
                click.echo(f"  Parsed {i + 1}/{len(tei_files)} documents...")

    click.echo(f"Total paragraphs: {len(data)}")

    # Evaluation config
    evaluation_config_class, evaluate_model_with_cv, format_results = get_evaluation()
    eval_config = evaluation_config_class(
        n_folds=cfg["training"].get("n_folds", 5),
        n_bootstrap=cfg["training"].get("n_bootstrap", 2000),
        n_jobs=cfg["training"].get("n_jobs", 2),
        random_state=cfg["training"].get("random_state", 42),
    )

    # Evaluate with CV
    click.echo(f"\nEvaluating with {eval_config.n_folds}-fold cross-validation...")
    click.echo(f"  Bootstrap samples: {eval_config.n_bootstrap}")
    click.echo(f"  Parallel jobs: {eval_config.n_jobs}")

    results = evaluate_model_with_cv(model, data, eval_config)

    # Display results
    click.echo("\n" + "=" * 60)
    click.echo("RESULTS")
    click.echo("=" * 60)
    click.echo(format_results(results, "CRF"))

    # Save results
    output_dir = Path(cfg.get("output", {}).get("results_dir", "results"))
    output_dir.mkdir(parents=True, exist_ok=True)
    results_file = output_dir / "crf_results.json"

    # Convert StatisticalResult objects to dicts for JSON serialization
    results_dict = {
        metric: {
            "estimate": r.estimate,
            "ci_lower": r.ci_lower,
            "ci_upper": r.ci_upper,
            "se": r.se,
            "fold_scores": list(r.fold_scores) if r.fold_scores else [],
        }
        for metric, r in results.items()
    }

    with open(results_file, "w") as f:
        json.dump(results_dict, f, indent=2)

    click.echo(f"\nResults saved to {results_file}")

    # Save model if requested
    if save_model:
        click.echo("\nTraining final model on all data for saving...")
        # Train on all data
        model.train(data)

        # Save the model
        model_path = Path(save_model)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        model.save_model(str(model_path))
        click.echo(f"Model saved to {model_path}")


@cli.command()
@click.option(
    "--config", type=click.Path(exists=True), required=True, help="Path to YAML configuration file"
)
@click.option(
    "--model",
    type=str,
    default=None,
    help="Model name (overrides config): distilbert or modernbert",
)
@click.option("--batch-size", type=int, default=None, help="Batch size (overrides config)")
@click.option("--epochs", type=int, default=None, help="Number of epochs (overrides config)")
@click.option("--lr", type=float, default=None, help="Learning rate (overrides config)")
@click.option(
    "--save-model",
    type=str,
    default=None,
    help="Path to save trained model (e.g., models/distilbert)",
)
def train_transformer(
    config: str,
    model: Optional[str],
    batch_size: Optional[int],
    epochs: Optional[int],
    lr: Optional[float],
    save_model: Optional[str],
):
    """Train transformer model with train/val/test split."""
    click.echo("Loading configuration...")
    cfg = load_config(config)

    # Apply CLI overrides
    if model is not None:
        cfg["model"]["model_name"] = model
    if batch_size is not None:
        cfg["model"]["batch_size"] = batch_size
    if epochs is not None:
        cfg["model"]["epochs"] = epochs
    if lr is not None:
        cfg["model"]["learning_rate"] = lr

    # Determine model type
    (
        distilbert_model_class,
        distilbert_config_class,
        modernbert_model_class,
        modernbert_config_class,
    ) = get_transformer_models()
    model_name = cfg["model"]["model_name"]
    if "distilbert" in model_name.lower():
        model_class = distilbert_model_class
        config_class = distilbert_config_class
        click.echo("Using DistilBERT model")
    elif "modernbert" in model_name.lower():
        model_class = modernbert_model_class
        config_class = modernbert_config_class
        click.echo("Using ModernBERT model")
    else:
        click.echo(f"Error: Unknown model '{model_name}'", err=True)
        sys.exit(1)

    # Initialize model
    click.echo("Initializing model...")
    model_config = config_class(**cfg["model"])
    model = model_class(model_config)

    # Load data
    click.echo(f"Loading corpus from {cfg['data']['corpus_dir']}...")
    corpus_dir = cfg["data"]["corpus_dir"]
    max_docs = cfg["data"].get("max_docs")

    # Load and split data
    parser = TEIParser()
    corpus_path = Path(corpus_dir)
    tei_files = (
        list(corpus_path.glob("*.xml"))[:max_docs] if max_docs else list(corpus_path.glob("*.xml"))
    )

    if not tei_files:
        click.echo(f"Error: No TEI files found in {corpus_dir}", err=True)
        sys.exit(1)

    click.echo(f"Found {len(tei_files)} documents")

    # Parse all documents
    all_data = []
    for i, tei_file in enumerate(tei_files):
        doc = parser.parse_tei_file(str(tei_file), tei_file.stem)
        paras = parser.create_tokenized_paragraphs(doc)
        all_data.extend(paras)
        if (i + 1) % 10 == 0:
            click.echo(f"  Parsed {i + 1}/{len(tei_files)} documents...")

    click.echo(f"Total paragraphs: {len(all_data)}")

    # Train/val/test split
    train_split = cfg["data"].get("train_split", 0.7)
    val_split = cfg["data"].get("val_split", 0.15)

    n_train = int(len(all_data) * train_split)
    n_val = int(len(all_data) * val_split)

    train_data = all_data[:n_train]
    val_data = all_data[n_train : n_train + n_val]
    test_data = all_data[n_train + n_val :]

    click.echo("\nData split:")
    click.echo(f"  Train: {len(train_data)} paragraphs")
    click.echo(f"  Val:   {len(val_data)} paragraphs")
    click.echo(f"  Test:  {len(test_data)} paragraphs")

    # Train
    click.echo(f"\nTraining for {model_config.epochs} epochs...")
    click.echo(f"  Batch size: {model_config.batch_size}")
    click.echo(f"  Learning rate: {model_config.learning_rate}")
    click.echo(f"  Mixed precision (BF16): {model_config.bf16}")

    # Call train method
    if hasattr(model, "train"):
        model.train(train_data, val_data)  # type: ignore[arg-type]
    else:
        raise TypeError(f"Model {type(model).__name__} does not have a train method")

    click.echo("\nTraining completed!")

    # Save model if requested
    if save_model:
        click.echo("\nSaving model...")
        model_path = Path(save_model)
        model_path.parent.mkdir(parents=True, exist_ok=True)

        # Call save_model method (exists on all concrete model classes)
        model.save_model(str(model_path))  # type: ignore[attr-defined]

        click.echo(f"Model saved to {model_path}")


@cli.command()
@click.option(
    "--model-type",
    type=click.Choice(["crf", "distilbert", "modernbert", "baseline"], case_sensitive=False),
    required=True,
    help="Type of model to load",
)
@click.option(
    "--model-path",
    type=click.Path(exists=True),
    required=True,
    help="Path to saved model (directory for transformers, .pkl for CRF)",
)
@click.option(
    "--corpus",
    type=click.Path(exists=True),
    required=True,
    help="Path to corpus directory with TEI XML files",
)
@click.option("--max-docs", type=int, default=None, help="Maximum number of documents to process")
@click.option("--output", type=str, default=None, help="Output file for predictions (JSON format)")
@click.option("--verbose", is_flag=True, help="Show detailed predictions")
def predict(
    model_type: str,
    model_path: str,
    corpus: str,
    max_docs: Optional[int],
    output: Optional[str],
    verbose: bool,
):
    """Load a trained model and predict speech labels for new data.

    Examples:
        # CRF model
        python -m speech_detection.cli predict --model-type crf \\
            --model-path models/crf_model.pkl --corpus ../corpora/wright-american-fiction

        # Transformer model
        python -m speech_detection.cli predict --model-type distilbert \\
            --model-path models/distilbert_trained --corpus ../corpora/test-data

        # Save predictions to file
        python -m speech_detection.cli predict --model-type crf \\
            --model-path models/crf_model.pkl --corpus ../corpora/data \\
            --output predictions.json
    """
    click.echo(f"Loading {model_type.upper()} model from {model_path}...")

    # Load the appropriate model
    if model_type == "crf":
        from speech_detection.models import CRFConfig, CRFModel

        # CRF load_model is an instance method, need to create instance first
        config = CRFConfig()  # Will be loaded from saved model
        model = CRFModel(config)
        model.load_model(model_path)  # type: ignore[arg-type]
    elif model_type == "distilbert":
        from speech_detection.models import DistilBERTModel

        model = DistilBERTModel.load_model(model_path)
    elif model_type == "modernbert":
        from speech_detection.models import ModernBERTModel

        model = ModernBERTModel.load_model(model_path)
    elif model_type == "baseline":
        from speech_detection.models import QuoteBaselineConfig, QuoteBaselineModel

        # Baseline doesn't need loading, just initialize
        model = QuoteBaselineModel(QuoteBaselineConfig())  # type: ignore[assignment]
        click.echo("Note: Baseline is rule-based, no model loaded")

    click.echo("Model loaded successfully")

    # Load data
    click.echo(f"\nLoading data from {corpus}...")
    parser = TEIParser()
    corpus_path = Path(corpus)
    tei_files = (
        list(corpus_path.glob("*.xml"))[:max_docs] if max_docs else list(corpus_path.glob("*.xml"))
    )

    if not tei_files:
        click.echo(f"Error: No TEI files found in {corpus}", err=True)
        sys.exit(1)

    click.echo(f"Found {len(tei_files)} documents")

    # Parse documents
    all_data = []
    for i, tei_file in enumerate(tei_files):
        doc = parser.parse_tei_file(str(tei_file), tei_file.stem)
        paras = parser.create_tokenized_paragraphs(doc)
        all_data.extend(paras)
        if (i + 1) % 10 == 0:
            click.echo(f"  Parsed {i + 1}/{len(tei_files)} documents...")

    click.echo(f"\nTotal paragraphs: {len(all_data)}")

    # Run predictions
    click.echo("\nRunning predictions...")
    predictions = model.predict_paragraphs(all_data)

    # Calculate statistics
    speech_paras = sum(
        1 for p in predictions if any(label != "O" for label in p.predicted_bio_labels)
    )
    total_speech_tokens = sum(
        sum(1 for label in p.predicted_bio_labels if label != "O") for p in predictions
    )
    total_tokens = sum(len(p.tokens) for p in predictions)

    # Display results
    click.echo("\n" + "=" * 60)
    click.echo("PREDICTION RESULTS")
    click.echo("=" * 60)
    click.echo(f"Total paragraphs:     {len(predictions):,}")
    click.echo(f"Paragraphs with speech: {speech_paras:,}")
    click.echo(f"Total tokens:          {total_tokens:,}")
    click.echo(f"Speech tokens:         {total_speech_tokens:,}")
    click.echo(f"Speech ratio:          {total_speech_tokens / total_tokens:.1%}")

    # Show detailed predictions if verbose
    if verbose:
        click.echo("\n" + "=" * 60)
        click.echo("DETAILED PREDICTIONS (first 10 with speech)")
        click.echo("=" * 60)

        count = 0
        for pred in predictions:
            speech_tokens = [
                (i, t, label)
                for i, (t, label) in enumerate(
                    zip(pred.tokens, pred.predicted_bio_labels, strict=True)
                )
                if label != "O"
            ]

            if speech_tokens:
                if count >= 10:
                    break

                click.echo(f"\nDoc: {pred.doc_id} | Para: {pred.para_id}")
                click.echo(f"  Text: {pred.text[:100]}...")
                click.echo(f"  Speech tokens ({len(speech_tokens)}):")
                for i, token, label in speech_tokens[:20]:
                    marker = "★" if label.startswith("B-") else ""
                    click.echo(f"    [{i:2d}] {token:30s} {label}{marker}")

                count += 1

    # Save predictions if output file specified
    if output:
        import json

        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert predictions to serializable format
        predictions_data = [
            {
                "doc_id": p.doc_id,
                "para_id": p.para_id,
                "tokens": p.tokens,
                "predicted_bio_labels": p.predicted_bio_labels,
                "text": p.text,
            }
            for p in predictions
        ]

        with open(output_path, "w") as f:
            json.dump(predictions_data, f, indent=2)

        click.echo(f"\nPredictions saved to {output_path}")


@cli.command()
@click.option(
    "--corpus", type=click.Path(exists=True), required=True, help="Path to corpus directory"
)
@click.option("--max-docs", type=int, default=None, help="Maximum number of documents to load")
def data_info(corpus: str, max_docs: Optional[int]):
    """Display information about TEI corpus."""
    click.echo(f"Loading corpus from {corpus}...")

    parser = TEIParser()
    corpus_path = Path(corpus)
    tei_files = (
        list(corpus_path.glob("*.xml"))[:max_docs] if max_docs else list(corpus_path.glob("*.xml"))
    )

    if not tei_files:
        click.echo(f"Error: No TEI files found in {corpus}", err=True)
        sys.exit(1)

    click.echo(f"\nFound {len(tei_files)} documents\n")

    total_paras = 0
    total_tokens = 0
    total_speech_tokens = 0

    for tei_file in tei_files:
        doc = parser.parse_tei_file(str(tei_file), tei_file.stem)
        paras = parser.create_tokenized_paragraphs(doc)

        n_tokens = sum(len(p.get("tokens", [])) for p in paras)
        n_speech = sum(sum(1 for label in p.get("bio_labels", []) if label != "O") for p in paras)

        total_paras += len(paras)
        total_tokens += n_tokens
        total_speech_tokens += n_speech

    avg_tokens_per_para = total_tokens / total_paras if total_paras > 0 else 0
    speech_ratio = total_speech_tokens / total_tokens if total_tokens > 0 else 0

    click.echo("CORPUS STATISTICS")
    click.echo("=" * 60)
    click.echo(f"Documents:        {len(tei_files)}")
    click.echo(f"Paragraphs:       {total_paras:,}")
    click.echo(f"Total tokens:     {total_tokens:,}")
    click.echo(f"Speech tokens:    {total_speech_tokens:,}")
    click.echo(f"Speech ratio:     {speech_ratio:.1%}")
    click.echo(f"Avg tokens/para:  {avg_tokens_per_para:.1f}")


@cli.command()
@click.option(
    "--corpus",
    type=click.Path(exists=True),
    required=False,
    help="Path to corpus directory (only used if --splits-path not found)",
)
@click.option(
    "--splits-path", type=str, default="../datasets/splits.json", help="Path to splits.json file"
)
@click.option(
    "--split",
    type=click.Choice(["train", "validation", "test"], case_sensitive=False),
    default="test",
    help="Which split to evaluate on",
)
@click.option("--max-docs", type=int, default=None, help="Maximum number of documents to process")
@click.option("--output", type=str, default=None, help="Output file for results (JSON format)")
def evaluate_baseline(
    corpus: Optional[str],
    splits_path: str,
    split: str,
    max_docs: Optional[int],
    output: Optional[str],
):
    """Evaluate quote baseline on corpus with ground truth labels.

    Examples:
        # Evaluate on test split using splits.json
        python -m speech_detection.cli evaluate-baseline \\
            --splits-path ../datasets/splits.json --split test

        # Evaluate on training data with max documents
        python -m speech_detection.cli evaluate-baseline \\
            --split train --max-docs 100

        # Evaluate on a specific corpus (fallback, no splits)
        python -m speech_detection.cli evaluate-baseline \\
            --corpus ../corpora/data --max-docs 10
    """
    from speech_detection.evaluation import compute_f1, compute_precision, compute_recall
    from speech_detection.models import QuoteBaselineConfig, QuoteBaselineModel

    click.echo(f"Evaluating Quote Baseline on {split} split...")

    # Load data
    if Path(splits_path).exists():
        click.echo(f"Using splits from {splits_path}...")
        from speech_detection.data.splits import load_split_data

        parser = TEIParser()
        data = load_split_data(split, splits_path, "..", max_docs, parser)
    else:
        if not corpus:
            click.echo("Error: --corpus is required when --splits-path file not found", err=True)
            sys.exit(1)

        click.echo(f"Loading corpus from {corpus}...")
        corpus_path = Path(corpus)
        tei_files = (
            list(corpus_path.glob("*.xml"))[:max_docs]
            if max_docs
            else list(corpus_path.glob("*.xml"))
        )

        if not tei_files:
            click.echo(f"Error: No TEI files found in {corpus}", err=True)
            sys.exit(1)

        click.echo(f"Found {len(tei_files)} documents")

        parser = TEIParser()
        data = []
        for i, tei_file in enumerate(tei_files):
            doc = parser.parse_tei_file(str(tei_file), tei_file.stem)
            paras = parser.create_tokenized_paragraphs(doc)
            data.extend(paras)
            if (i + 1) % 10 == 0:
                click.echo(f"  Parsed {i + 1}/{len(tei_files)} documents...")

    click.echo(f"Loaded {len(data)} paragraphs")

    # Initialize baseline model
    model = QuoteBaselineModel(QuoteBaselineConfig())

    # Predict
    click.echo("\nRunning predictions...")
    predictions = model.predict_paragraphs(data)

    # Compute metrics
    click.echo("Computing metrics...")
    true_labels = [p["bio_labels"] for p in data]
    pred_labels = [pred.predicted_bio_labels for pred in predictions]

    f1 = compute_f1(true_labels, pred_labels)
    precision = compute_precision(true_labels, pred_labels)
    recall = compute_recall(true_labels, pred_labels)

    # Display results
    click.echo("\n" + "=" * 60)
    click.echo("BASELINE RESULTS")
    click.echo("=" * 60)
    click.echo(f"F1:        {f1:.4f}")
    click.echo(f"Precision: {precision:.4f}")
    click.echo(f"Recall:    {recall:.4f}")

    # Save results if requested
    if output:
        import json

        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        results_dict = {
            "f1": f1,
            "precision": precision,
            "recall": recall,
            "n_predictions": len(predictions),
        }

        with open(output_path, "w") as f:
            json.dump(results_dict, f, indent=2)

        click.echo(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    cli()
