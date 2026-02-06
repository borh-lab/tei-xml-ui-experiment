#!/bin/bash
# Monitor all training jobs and collect results

echo "=================================="
echo "Training Job Monitor"
echo "=================================="
echo ""
echo "Checking training status..."
echo ""

# Function to check if process is running
is_running() {
    pgrep -f "$1" > /dev/null
}

# Check CRF training
echo "1. CRF Fast Config Training"
echo "============================"
if is_running "train-crf.*crf_fast"; then
    echo "Status: 🔄 RUNNING"
    echo "Log: /tmp/crf_fast.log"
    echo ""
    echo "Recent progress:"
    tail -10 /tmp/crf_fast.log | grep -E "Fold|Bootstrap|Preparing|Evaluating" || tail -5 /tmp/crf_fast.log
else
    echo "Status: ✅ COMPLETED (or not started)"
    echo ""
    echo "Results:"
    tail -30 /tmp/crf_fast.log | grep -A 15 "RESULTS" || echo "No results yet"
fi
echo ""

# Check DistilBERT training
echo "2. DistilBERT Baseline Training"
echo "================================"
if is_running "train-transformer.*distilbert_baseline"; then
    echo "Status: 🔄 RUNNING"
    echo "Log: /tmp/distilbert_baseline.log"
    echo ""
    echo "Recent progress:"
    tail -10 /tmp/distilbert_baseline.log | grep -E "Epoch|Loss|F1|Training" || tail -5 /tmp/distilbert_baseline.log
else
    echo "Status: ✅ COMPLETED (or not started)"
    echo ""
    echo "Results:"
    tail -30 /tmp/distilbert_baseline.log | grep -E "Validation Metrics|Training complete|F1:" || echo "No results yet"
fi
echo ""

# Check Baseline evaluation
echo "3. Quote Baseline Evaluation"
echo "=============================="
if [ -f /tmp/baseline_eval.log ]; then
    echo "Status: ✅ COMPLETED"
    echo ""
    echo "Results:"
    tail -30 /tmp/baseline_eval.log | grep -A 10 "BASELINE RESULTS" || cat /tmp/baseline_eval.log
else
    echo "Status: Not started"
fi
echo ""

# Summary
echo "=================================="
echo "Summary"
echo "=================================="
echo "Training jobs:"
pgrep -fa "train-crf|train-transformer" | wc -l
echo "jobs running"
echo ""
echo "Log files:"
ls -lh /tmp/*.log 2>/dev/null | grep -E "crf_fast|distilbert_baseline|baseline_eval" || echo "No log files found"
echo ""
echo "To monitor in real-time:"
echo "  tail -f /tmp/crf_fast.log"
echo "  tail -f /tmp/distilbert_baseline.log"
