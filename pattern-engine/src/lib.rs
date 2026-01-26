use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Get current timestamp (works in both WASM and native)
fn get_current_time() -> u64 {
    #[cfg(target_arch = "wasm32")]
    {
        js_sys::Date::now() as u64
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

// Pattern match information for confidence calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMatch {
    pub recent: bool,
    pub chapter_frequency: f64,
    pub turn_taking: bool,
    pub name_mention: bool,
    pub dialogue_length_score: f64,
}

// Context information for confidence calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context {
    pub total_passages: usize,
    pub unique_speakers: usize,
    pub avg_dialogue_length: f64,
}

// Speaker pattern data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakerPattern {
    pub xml_id: String,
    pub last_used: u64,
    pub position_frequency: std::collections::HashMap<String, usize>,
    pub common_followers: Vec<String>,
    pub common_preceders: Vec<String>,
    pub chapter_affinity: std::collections::HashMap<String, f64>,
    pub dialogue_length_avg: f64,
}

/// Calculate confidence score for speaker detection
/// Returns a value between 0.0 and 1.0
#[wasm_bindgen]
pub fn calculate_confidence(
    _text: &str,
    _speaker: &str,
    patterns_json: &str
) -> f64 {
    // Parse the patterns JSON
    let pattern_match: PatternMatch = match serde_json::from_str(patterns_json) {
        Ok(p) => p,
        Err(_) => {
            // If parsing fails, return default confidence
            return 0.5;
        }
    };

    let mut score = 0.0;

    // Factor 1: Recency boost (30% weight)
    // If this speaker spoke recently in the text, increase confidence
    if pattern_match.recent {
        score += 0.3;
    }

    // Factor 2: Chapter frequency (25% weight)
    // If this speaker dominates the current chapter, increase confidence
    score += pattern_match.chapter_frequency * 0.25;

    // Factor 3: Turn-taking pattern (20% weight)
    // If we detect an A-B-A turn-taking pattern suggesting this speaker
    if pattern_match.turn_taking {
        score += 0.2;
    }

    // Factor 4: Name mention in context (10% weight)
    // If the speaker's name is mentioned in the narrative context
    if pattern_match.name_mention {
        score += 0.1;
    }

    // Factor 5: Dialogue length distribution (15% weight)
    // If the dialogue length matches this speaker's typical pattern
    score += pattern_match.dialogue_length_score * 0.15;

    // Normalize to 0.0-1.0 range
    let confidence = score.min(1.0).max(0.0);

    confidence
}

/// Store a learned pattern for a speaker
#[wasm_bindgen]
pub fn store_pattern(
    speaker: &str,
    chapter: &str,
    position: usize,
    dialogue_length: f64,
    patterns_json: &str
) -> String {
    // Parse existing patterns or create new
    let mut pattern: SpeakerPattern = match serde_json::from_str(patterns_json) {
        Ok(p) => p,
        Err(_) => SpeakerPattern {
            xml_id: speaker.to_string(),
            last_used: 0,
            position_frequency: std::collections::HashMap::new(),
            common_followers: Vec::new(),
            common_preceders: Vec::new(),
            chapter_affinity: std::collections::HashMap::new(),
            dialogue_length_avg: 0.0,
        }
    };

    // Update pattern
    pattern.last_used = get_current_time();
    pattern.xml_id = speaker.to_string();

    // Update position frequency
    let key = format!("{}_{}", chapter, position);
    *pattern.position_frequency.entry(key).or_insert(0) += 1;

    // Update chapter affinity
    *pattern.chapter_affinity.entry(chapter.to_string()).or_insert(0.0) += 1.0;

    // Update dialogue length average (exponential moving average)
    if pattern.dialogue_length_avg > 0.0 {
        pattern.dialogue_length_avg = pattern.dialogue_length_avg * 0.8 + dialogue_length * 0.2;
    } else {
        pattern.dialogue_length_avg = dialogue_length;
    }

    // Serialize back to JSON
    serde_json::to_string(&pattern).unwrap_or_else(|_| "{}".to_string())
}

/// Get patterns for a specific speaker
#[wasm_bindgen]
pub fn get_patterns(speaker: &str, all_patterns_json: &str) -> String {
    // Parse all patterns
    let all_patterns: std::collections::HashMap<String, SpeakerPattern> =
        match serde_json::from_str(all_patterns_json) {
            Ok(p) => p,
            Err(_) => return "{}".to_string()
        };

    // Get patterns for this speaker
    match all_patterns.get(speaker) {
        Some(pattern) => serde_json::to_string(pattern).unwrap_or_else(|_| "{}".to_string()),
        None => "{}".to_string()
    }
}

/// Update patterns based on user feedback/corrections
#[wasm_bindgen]
pub fn update_from_feedback(
    passage: &str,
    accepted_speaker: &str,
    rejected_speakers_json: &str,
    current_patterns_json: &str
) -> String {
    // Parse rejected speakers
    let rejected_speakers: Vec<String> = match serde_json::from_str(rejected_speakers_json) {
        Ok(r) => r,
        Err(_) => Vec::new()
    };

    // Parse current patterns
    let mut all_patterns: std::collections::HashMap<String, SpeakerPattern> =
        match serde_json::from_str(current_patterns_json) {
            Ok(p) => p,
            Err(_) => std::collections::HashMap::new()
        };

    // Calculate dialogue length
    let dialogue_length = passage.split_whitespace().count() as f64;

    // Boost accepted speaker pattern
    let accepted_pattern = all_patterns
        .entry(accepted_speaker.to_string())
        .or_insert_with(|| SpeakerPattern {
            xml_id: accepted_speaker.to_string(),
            last_used: get_current_time(),
            position_frequency: std::collections::HashMap::new(),
            common_followers: Vec::new(),
            common_preceders: Vec::new(),
            chapter_affinity: std::collections::HashMap::new(),
            dialogue_length_avg: dialogue_length,
        });

    accepted_pattern.last_used = get_current_time();

    // Update dialogue length average
    if accepted_pattern.dialogue_length_avg > 0.0 {
        accepted_pattern.dialogue_length_avg =
            accepted_pattern.dialogue_length_avg * 0.9 + dialogue_length * 0.1;
    } else {
        accepted_pattern.dialogue_length_avg = dialogue_length;
    }

    // Decrease confidence in rejected speakers (by not updating their last_used time)
    for rejected in rejected_speakers {
        if let Some(pattern) = all_patterns.get_mut(&rejected) {
            // Penalize rejected speakers by aging their patterns
            pattern.last_used = pattern.last_used.saturating_sub(86400000); // Subtract 1 day
        }
    }

    // Serialize updated patterns
    serde_json::to_string(&all_patterns).unwrap_or_else(|_| "{}".to_string())
}

/// Detect speaker using pattern matching algorithm
#[wasm_bindgen]
pub fn detect_speaker(
    text: &str,
    chapter: &str,
    position: usize,
    all_patterns_json: &str
) -> String {
    // Parse all patterns
    let all_patterns: std::collections::HashMap<String, SpeakerPattern> =
        match serde_json::from_str(all_patterns_json) {
            Ok(p) => p,
            Err(_) => return "speaker1".to_string()
        };

    if all_patterns.is_empty() {
        return "speaker1".to_string();
    }

    // Calculate scores for each speaker
    let mut best_speaker = "speaker1".to_string();
    let mut best_score = 0.0;

    let now = get_current_time();
    let dialogue_length = text.split_whitespace().count() as f64;

    for (speaker_id, pattern) in &all_patterns {
        let mut score = 0.0;

        // Factor 1: Recency (recently used speakers more likely)
        let time_since_use = now.saturating_sub(pattern.last_used);
        let recency_score = if time_since_use < 300000 { // 5 minutes
            0.4
        } else if time_since_use < 3600000 { // 1 hour
            0.2
        } else {
            0.0
        };
        score += recency_score;

        // Factor 2: Chapter affinity
        let chapter_affinity = pattern.chapter_affinity.get(chapter).copied().unwrap_or(0.0);
        score += (chapter_affinity / 10.0).min(0.3);

        // Factor 3: Position frequency
        let pos_key = format!("{}_{}", chapter, position);
        let pos_freq = pattern.position_frequency.get(&pos_key).copied().unwrap_or(0);
        score += (pos_freq as f64 / 5.0).min(0.2);

        // Factor 4: Dialogue length match
        if pattern.dialogue_length_avg > 0.0 {
            let length_diff = (dialogue_length - pattern.dialogue_length_avg).abs();
            let length_score = (1.0 - (length_diff / dialogue_length)).max(0.0);
            score += length_score * 0.1;
        }

        if score > best_score {
            best_score = score;
            best_speaker = speaker_id.clone();
        }
    }

    best_speaker
}

// Regular (non-wasm) tests for core logic
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_calculate_confidence_high() {
        let pattern = PatternMatch {
            recent: true,
            chapter_frequency: 0.9,
            turn_taking: true,
            name_mention: true,
            dialogue_length_score: 0.8,
        };

        let patterns_json = serde_json::to_string(&pattern).unwrap();
        let confidence = calculate_confidence("Test text", "speaker1", &patterns_json);

        // High confidence expected: 0.3 + 0.225 + 0.2 + 0.1 + 0.12 = 0.945
        assert!(confidence > 0.9);
        assert!(confidence <= 1.0);
    }

    #[test]
    fn test_calculate_confidence_low() {
        let pattern = PatternMatch {
            recent: false,
            chapter_frequency: 0.1,
            turn_taking: false,
            name_mention: false,
            dialogue_length_score: 0.2,
        };

        let patterns_json = serde_json::to_string(&pattern).unwrap();
        let confidence = calculate_confidence("Test text", "speaker1", &patterns_json);

        // Low confidence expected: 0.0 + 0.025 + 0.0 + 0.0 + 0.03 = 0.055
        assert!(confidence < 0.2);
        assert!(confidence >= 0.0);
    }

    #[test]
    fn test_calculate_confidence_invalid_json() {
        let confidence = calculate_confidence("Test text", "speaker1", "invalid json");
        assert_eq!(confidence, 0.5); // Default confidence on error
    }

    #[test]
    fn test_store_pattern_new() {
        let pattern_json = "{}";
        let result = store_pattern("speaker1", "chapter1", 5, 25.0, pattern_json);

        let pattern: SpeakerPattern = serde_json::from_str(&result).unwrap();
        assert_eq!(pattern.xml_id, "speaker1");
        assert!(pattern.last_used > 0);
        assert_eq!(pattern.dialogue_length_avg, 25.0);
    }

    #[test]
    fn test_store_pattern_update() {
        let existing = SpeakerPattern {
            xml_id: "speaker1".to_string(),
            last_used: 1000,
            position_frequency: std::collections::HashMap::new(),
            common_followers: Vec::new(),
            common_preceders: Vec::new(),
            chapter_affinity: std::collections::HashMap::new(),
            dialogue_length_avg: 20.0,
        };
        let pattern_json = serde_json::to_string(&existing).unwrap();

        let result = store_pattern("speaker1", "chapter1", 5, 30.0, &pattern_json);
        let pattern: SpeakerPattern = serde_json::from_str(&result).unwrap();

        // EMA: 20.0 * 0.8 + 30.0 * 0.2 = 16.0 + 6.0 = 22.0
        assert!((pattern.dialogue_length_avg - 22.0).abs() < 0.01);
        assert!(pattern.last_used > 1000);
    }

    #[test]
    fn test_get_patterns_existing() {
        let mut all_patterns = std::collections::HashMap::new();
        all_patterns.insert(
            "speaker1".to_string(),
            SpeakerPattern {
                xml_id: "speaker1".to_string(),
                last_used: 12345,
                position_frequency: std::collections::HashMap::new(),
                common_followers: Vec::new(),
                common_preceders: Vec::new(),
                chapter_affinity: std::collections::HashMap::new(),
                dialogue_length_avg: 25.0,
            }
        );

        let all_json = serde_json::to_string(&all_patterns).unwrap();
        let result = get_patterns("speaker1", &all_json);

        let pattern: SpeakerPattern = serde_json::from_str(&result).unwrap();
        assert_eq!(pattern.xml_id, "speaker1");
        assert_eq!(pattern.last_used, 12345);
    }

    #[test]
    fn test_get_patterns_not_found() {
        let all_patterns: std::collections::HashMap<String, SpeakerPattern> =
            std::collections::HashMap::new();
        let all_json = serde_json::to_string(&all_patterns).unwrap();

        let result = get_patterns("speaker1", &all_json);
        assert_eq!(result, "{}");
    }

    #[test]
    fn test_update_from_feedback_boost_accepted() {
        let passage = "Hello world this is a test";
        let accepted = "speaker1";
        let rejected = "[]";
        let current = "{}";

        let result = update_from_feedback(passage, accepted, rejected, current);
        let all_patterns: std::collections::HashMap<String, SpeakerPattern> =
            serde_json::from_str(&result).unwrap();

        assert!(all_patterns.contains_key("speaker1"));
        let pattern = &all_patterns["speaker1"];
        assert_eq!(pattern.xml_id, "speaker1");
        // 6 words = 6.0 dialogue length
        assert_eq!(pattern.dialogue_length_avg, 6.0);
    }

    #[test]
    fn test_update_from_feedback_penalize_rejected() {
        let mut all_patterns = std::collections::HashMap::new();
        all_patterns.insert(
            "speaker2".to_string(),
            SpeakerPattern {
                xml_id: "speaker2".to_string(),
                last_used: get_current_time(),
                position_frequency: std::collections::HashMap::new(),
                common_followers: Vec::new(),
                common_preceders: Vec::new(),
                chapter_affinity: std::collections::HashMap::new(),
                dialogue_length_avg: 20.0,
            }
        );

        let current_json = serde_json::to_string(&all_patterns).unwrap();
        let rejected = "[\"speaker2\"]";

        let result = update_from_feedback("test", "speaker1", rejected, &current_json);
        let updated: std::collections::HashMap<String, SpeakerPattern> =
            serde_json::from_str(&result).unwrap();

        // speaker2 should have been penalized (last_use decreased)
        assert!(updated["speaker2"].last_used < all_patterns["speaker2"].last_used);
    }

    #[test]
    fn test_detect_speaker_empty_patterns() {
        let all_patterns: std::collections::HashMap<String, SpeakerPattern> =
            std::collections::HashMap::new();
        let all_json = serde_json::to_string(&all_patterns).unwrap();

        let result = detect_speaker("test text", "chapter1", 5, &all_json);
        assert_eq!(result, "speaker1"); // Default fallback
    }

    #[test]
    fn test_detect_speaker_scores() {
        let mut all_patterns = std::collections::HashMap::new();
        let now = get_current_time();

        // Recent speaker
        all_patterns.insert(
            "speaker_recent".to_string(),
            SpeakerPattern {
                xml_id: "speaker_recent".to_string(),
                last_used: now - 1000, // Very recent
                position_frequency: std::collections::HashMap::new(),
                common_followers: Vec::new(),
                common_preceders: Vec::new(),
                chapter_affinity: {
                    let mut map = std::collections::HashMap::new();
                    map.insert("chapter1".to_string(), 10.0);
                    map
                },
                dialogue_length_avg: 5.0,
            }
        );

        // Old speaker
        all_patterns.insert(
            "speaker_old".to_string(),
            SpeakerPattern {
                xml_id: "speaker_old".to_string(),
                last_used: now - 10000000, // Very old
                position_frequency: std::collections::HashMap::new(),
                common_followers: Vec::new(),
                common_preceders: Vec::new(),
                chapter_affinity: std::collections::HashMap::new(),
                dialogue_length_avg: 5.0,
            }
        );

        let all_json = serde_json::to_string(&all_patterns).unwrap();
        let result = detect_speaker("test text", "chapter1", 5, &all_json);

        // Recent speaker should be selected
        assert_eq!(result, "speaker_recent");
    }
}
