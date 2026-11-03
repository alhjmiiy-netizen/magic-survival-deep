import { StoryChapter } from '../types/game';

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 1,
    actName: 'Prologue',
    title: 'The Shattered Sanctuary',
    waveTarget: 1,
    unlocked: true,
    dialogue: [
      {
        speaker: 'Ancient Oracle',
        text: 'Archmage... the Celestial Seal has fractured. The demonic hordes of the Void pour across our sacred stone sanctum.',
      },
      {
        speaker: 'Archmage Caelen',
        text: 'I feel their corrupting miasma. As long as my grimoire remains intact, the light shall not be extinguished.',
      },
      {
        speaker: 'Voice of the Abyss',
        text: 'Foolish mortal. The stars themselves shall wither before our endless hunger.',
      },
    ],
  },
  {
    id: 2,
    actName: 'Chapter I',
    title: 'Rise of the Colossus',
    waveTarget: 8,
    unlocked: true,
    dialogue: [
      {
        speaker: 'Archmage Caelen',
        text: 'The earth shakes... the stones are cracking under immense weight.',
      },
      {
        speaker: 'Ancient Oracle',
        text: 'Beware! The Void Colossus Titan has awakened from the obsidian rift. Its magma core can incinerate entire realms!',
      },
      {
        speaker: 'Void Colossus',
        text: 'CRUSH... BREAK... YOUR CELESTIAL BONES WILL FUEL MY CORE!',
      },
    ],
  },
  {
    id: 3,
    actName: 'Chapter II',
    title: 'The Glacial Descent',
    waveTarget: 12,
    unlocked: false,
    dialogue: [
      {
        speaker: 'Lyra, Frost Valkyrie',
        text: 'The heat of the magma beast gives way to eternal winter. The frost winds of Niflheim awaken.',
      },
      {
        speaker: 'Archmage Caelen',
        text: 'We must fuse our spells. Combine the astral fire with absolute frost to shatter their carapace.',
      },
    ],
  },
  {
    id: 4,
    actName: 'Chapter III',
    title: 'The Crucible of Hellfire',
    waveTarget: 16,
    unlocked: false,
    dialogue: [
      {
        speaker: 'Kael, Pyromancer',
        text: 'The sky weeps blood and brimstone! Let them taste the primordial flames of creation!',
      },
      {
        speaker: 'Ancient Oracle',
        text: 'The final wave approaches. If you survive the 20th night, you shall transcend mortality itself.',
      },
    ],
  },
  {
    id: 5,
    actName: 'Chapter IV',
    title: 'Ascension into Legend',
    waveTarget: 20,
    unlocked: false,
    dialogue: [
      {
        speaker: 'Voice of the Abyss',
        text: 'IMPOSSIBLE... A MORTAL CONQUERING THE ENTIRE VOID ARMY...',
      },
      {
        speaker: 'Archmage Caelen',
        text: 'The night has broken. The sanctuary stands eternal. We have become legendary.',
      },
    ],
  },
];
