export interface EntitySpan {
  start: number;
  end: number;
  text: string;
  type: 'persName' | 'placeName' | 'orgName' | 'date' | 'dialogue';
  confidence: number;
}

export interface DialogueSpan extends EntitySpan {
  type: 'dialogue';
  speaker?: string;
}
