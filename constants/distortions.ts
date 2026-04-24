export interface Distortion {
  id: string;
  name: string;
  shortDesc: string;
  example: string;
}

export const DISTORTIONS: Distortion[] = [
  {
    id: 'all_or_nothing',
    name: 'All-or-nothing thinking',
    shortDesc: 'Seeing things in black and white, with no middle ground.',
    example: '"If I\'m not perfect, I\'m a total failure."',
  },
  {
    id: 'catastrophizing',
    name: 'Catastrophizing',
    shortDesc: 'Expecting the worst possible outcome.',
    example: '"I made one mistake — my whole project is ruined."',
  },
  {
    id: 'mind_reading',
    name: 'Mind reading',
    shortDesc: 'Assuming you know what others are thinking.',
    example: '"They didn\'t reply — they must be annoyed at me."',
  },
  {
    id: 'fortune_telling',
    name: 'Fortune telling',
    shortDesc: 'Predicting a negative outcome as if it\'s a certainty.',
    example: '"I just know the interview will go badly."',
  },
  {
    id: 'mental_filtering',
    name: 'Mental filtering',
    shortDesc: 'Focusing only on the negatives while ignoring positives.',
    example: '"I got great feedback, but one person had a criticism — clearly I failed."',
  },
  {
    id: 'discounting_positives',
    name: 'Discounting the positive',
    shortDesc: 'Dismissing good things as if they don\'t count.',
    example: '"Anyone could have done that — it wasn\'t a big deal."',
  },
  {
    id: 'emotional_reasoning',
    name: 'Emotional reasoning',
    shortDesc: 'Treating your feelings as facts.',
    example: '"I feel stupid, so I must be stupid."',
  },
  {
    id: 'should_statements',
    name: 'Should statements',
    shortDesc: 'Rigid rules about how you or others must behave.',
    example: '"I should always be productive. I shouldn\'t need help."',
  },
  {
    id: 'labeling',
    name: 'Labeling',
    shortDesc: 'Attaching a harsh label to yourself or others based on one event.',
    example: '"I forgot that — I\'m such an idiot."',
  },
  {
    id: 'personalization',
    name: 'Personalization',
    shortDesc: 'Blaming yourself for things outside your control.',
    example: '"My friend is in a bad mood — I must have done something wrong."',
  },
];

export const DISTORTION_NAMES = DISTORTIONS.map((d) => d.name);
