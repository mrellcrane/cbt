export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  icon: string;
  // The exercise context passed to the system prompt when this lesson is selected.
  promptContext: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'cognitive_triangle',
    title: 'The Cognitive Triangle',
    subtitle: 'How thoughts, feelings, and behaviors shape each other',
    durationMin: 5,
    icon: '🔺',
    promptContext: `Lesson: The Cognitive Triangle.
Teach that thoughts, feelings, and behaviors are deeply interconnected and form a loop. A thought influences how we feel; how we feel influences what we do; and what we do shapes future thoughts. Use a relatable everyday example (e.g., being late to a meeting). Deliver in 3–4 short chunks, pausing for reflection after each.`,
  },
  {
    id: 'thinking_traps',
    title: 'Common Thinking Traps',
    subtitle: 'Spotting the patterns that make hard moments harder',
    durationMin: 7,
    icon: '🪤',
    promptContext: `Lesson: Common Thinking Traps (Cognitive Distortions).
Introduce the concept that our brains sometimes run unhelpful shortcuts — we call these thinking traps. Cover 4–5 of the most common ones: all-or-nothing thinking, catastrophizing, mind reading, emotional reasoning, and personalization. For each, give a brief definition and a relatable example. Ask the user if any feel familiar. Deliver one distortion at a time and wait for a response.`,
  },
  {
    id: 'behavioral_activation',
    title: 'Behavioral Activation',
    subtitle: 'Why action comes before motivation (not after)',
    durationMin: 5,
    icon: '⚡',
    promptContext: `Lesson: Behavioral Activation.
Explain that when we feel low, we tend to withdraw — which makes us feel lower. Behavioral activation flips this: we act first, and the mood often follows. Cover: the mood-withdrawal spiral, how small actions break the cycle, scheduling one small pleasurable or meaningful activity. Use a relatable example. Encourage the user to think of one tiny action they could take today.`,
  },
  {
    id: 'reframing',
    title: 'The Art of Reframing',
    subtitle: 'Finding more balanced ways to see difficult situations',
    durationMin: 6,
    icon: '🔄',
    promptContext: `Lesson: Cognitive Reframing.
Explain that reframing isn't toxic positivity or pretending things are fine — it's finding a perspective that's more accurate and fair. Walk through the difference between an automatic (distorted) thought and a balanced thought. Use a worked example. Introduce the "good friend test": what would you tell a friend who had this thought? Invite the user to try a mini reframe on something small in their own life.`,
  },
  {
    id: 'mindfulness_basics',
    title: 'Mindfulness Basics',
    subtitle: 'Noticing thoughts without getting swept away by them',
    durationMin: 5,
    icon: '🌊',
    promptContext: `Lesson: Mindfulness and Defusion Basics.
Explain that mindfulness in a CBT context means noticing thoughts without automatically believing or acting on them. Introduce the idea of defusion — creating a little distance from thoughts ("I notice I'm having the thought that..."). Teach a simple 3-breath grounding exercise. Keep it practical and non-mystical.`,
  },
];
