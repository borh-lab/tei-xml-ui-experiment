export interface EntitySpan {
  start: number;
  end: number;
  text: string;
  type: 'persName' | 'placeName' | 'orgName' | 'date';
  confidence: number;
}

export interface DialogueSpan extends EntitySpan {
  type: 'dialogue';
  speaker?: string;
}
