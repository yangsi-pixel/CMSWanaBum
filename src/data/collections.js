import {
  AutoStoriesOutlined,
  EmojiEventsOutlined,
  ExploreOutlined,
  MenuBookOutlined,
  QuizOutlined,
  TranslateOutlined,
  GroupOutlined,
} from '@mui/icons-material';

export const countryRegions = {
  Cameroon: [
    'Adamawa',
    'Centre',
    'East',
    'Far North',
    'Littoral',
    'North',
    'North-West',
    'South',
    'South-West',
    'West',
  ],
};

export const collections = [
  { key: 'dialects', label: 'Dialects', description: 'Language variants and regional voices', icon: TranslateOutlined, idField: 'dialectId', columns: [['totalLessons', 'Lessons']], fields: [['dialectCode', 'text'], ['dialectName', 'text'], ['country', 'select', Object.keys(countryRegions)], ['region', 'select', countryRegions.Cameroon], ['description', 'long'], ['status', 'boolean']] },
  { key: 'lessons', label: 'Lessons', description: 'Teach through structured practice', icon: MenuBookOutlined, idField: 'lessonId', parents: [['dialectId', 'dialects']], fields: [['title', 'text'], ['description', 'long'], ['lessonIconUrl', 'text', null, { label: 'Lesson Icon URL', uploadKind: 'image' }], ['potReward', 'number', null, { label: 'Pot reward' }], ['status', 'boolean']] },
  { key: 'stories', label: 'Stories', description: 'Cultural reading experiences within a dialect', icon: AutoStoriesOutlined, idField: 'storyId', parents: [['dialectId', 'dialects']], fields: [['title', 'text', null, { label: 'Title in dialect', required: true }], ['titleEnglish', 'text', null, { label: 'Title in English', required: true }], ['description', 'long'], ['coverImageUrl', 'text', null, { label: 'Cover Image URL', uploadKind: 'image' }], ['audioUrl', 'text', null, { label: 'Audio URL', uploadKind: 'audio' }], ['dialectText', 'long', null, { label: 'Story text in dialect' }], ['translation', 'long'], ['coinsRequired', 'number', null, { label: 'Coins required to unlock', required: true, min: 0 }], ['reward', 'number'], ['unlockLevel', 'number'], ['order', 'number'], ['status', 'boolean']] },
  { key: 'vocabulary', label: 'Vocabulary', description: 'Vocabulary attached to a lesson', icon: ExploreOutlined, idField: 'vocabularyId', parents: [['dialectId', 'dialects'], ['lessonId', 'lessons']], fields: [
    ['type', 'select', ['word', 'sentence'], { label: 'Vocabulary type', required: true }],
    ['word', 'text', null, { label: 'Word', required: true, visibleWhen: (values) => values.type === 'word' }],
    ['sentence', 'long', null, { label: 'Sentence', required: true, visibleWhen: (values) => values.type === 'sentence' }],
    ['translation', 'text', null, { required: true }],
    ['audioUrl', 'text', null, { label: 'Audio URL', required: true, uploadKind: 'audio' }],
    ['imageUrl', 'text', null, { label: 'Image URL', required: true, uploadKind: 'image', visibleWhen: (values) => values.type === 'word' }],
    ['imageAudioUrl', 'text', null, { label: 'Image audio URL', uploadKind: 'audio', visibleWhen: (values) => values.type === 'word' }],
    ['exampleSentence', 'long', null, { label: 'Related example sentence', visibleWhen: (values) => values.type === 'word' }],
    ['exampleTranslation', 'long', null, { label: 'Example translation', visibleWhen: (values) => values.type === 'word' }],
    ['exampleAudioUrl', 'text', null, { label: 'Example audio URL', uploadKind: 'audio', visibleWhen: (values) => values.type === 'word' }],
    ['explanation', 'long', null, { label: 'Explanation' }],
    ['order', 'number', null, { label: 'Vocabulary order', visibleWhen: () => false }],
  ] },
  { key: 'communityWords', label: 'Community Words', description: 'Words submitted by the community', icon: ExploreOutlined, idField: 'communityWordId', parents: [['dialectId', 'dialects']], columns: [['userName', 'User'], ['text', 'Word'], ['translation', 'Translation'], ['upvotes', 'Upvotes'], ['downvotes', 'Downvotes'], ['wordOfTheDay', 'Word of the day'], ['status', 'Status']], tableHiddenFields: ['audioPath', 'userId'], fields: [['text', 'text', null, { label: 'Word', required: true }], ['translation', 'text', null, { label: 'Translation', required: true }], ['audioPath', 'text', null, { label: 'Audio URL', required: true, uploadKind: 'audio' }], ['userId', 'text', null, { label: 'User ID', required: true }], ['upvotes', 'number', null, { label: 'Upvotes' }], ['downvotes', 'number', null, { label: 'Downvotes' }], ['wordOfTheDay', 'boolean', null, { label: 'Word of the day' }], ['status', 'boolean']] },
  { key: 'exercises', label: 'Exercises', description: 'Practice activities attached to a lesson', icon: QuizOutlined, idField: 'exerciseId', parents: [['dialectId', 'dialects'], ['lessonId', 'lessons']], fields: [
    ['exerciseType', 'select', ['multipleChoice', 'fillBlank', 'matching', 'listenChoose', 'typeWhatYouHear', 'trueFalse'], { label: 'Exercise type', required: true }],
    ['questionPrompt', 'text', null, { label: 'Question / Prompt', required: true, visibleWhen: (values) => Boolean(values.exerciseType) }],
    ['audioUrl', 'text', null, { label: 'Audio URL', uploadKind: 'audio', visibleWhen: (values) => ['multipleChoice', 'trueFalse'].includes(values.exerciseType) }],
    ['option1', 'text', null, { label: 'Option 1', required: true, visibleWhen: (values) => ['multipleChoice', 'listenChoose'].includes(values.exerciseType) }],
    ['option2', 'text', null, { label: 'Option 2', required: true, visibleWhen: (values) => ['multipleChoice', 'listenChoose'].includes(values.exerciseType) }],
    ['option3', 'text', null, { label: 'Option 3', required: true, visibleWhen: (values) => ['multipleChoice', 'listenChoose'].includes(values.exerciseType) }],
    ['option4', 'text', null, { label: 'Option 4', required: true, visibleWhen: (values) => ['multipleChoice', 'listenChoose'].includes(values.exerciseType) }],
    ['correctAnswer', 'select', [], { label: 'Correct Answer', required: true, optionsFrom: (values) => [values.option1, values.option2, values.option3, values.option4].filter(Boolean), visibleWhen: (values) => ['multipleChoice', 'listenChoose'].includes(values.exerciseType) }],
    ['translation', 'text', null, { label: 'Translation', required: true, visibleWhen: (values) => values.exerciseType === 'fillBlank' }],
    ['sampleCorrectAnswer1', 'text', null, { label: 'Acceptable answer 1', required: true, visibleWhen: (values) => ['fillBlank', 'typeWhatYouHear'].includes(values.exerciseType) }],
    ['sampleCorrectAnswer2', 'text', null, { label: 'Acceptable answer 2', visibleWhen: (values) => ['fillBlank', 'typeWhatYouHear'].includes(values.exerciseType) }],
    ['leftItem1', 'text', null, { label: 'Left Item 1', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['leftItem2', 'text', null, { label: 'Left Item 2', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['leftItem3', 'text', null, { label: 'Left Item 3', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['leftItem4', 'text', null, { label: 'Left Item 4', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['rightAnswer1', 'text', null, { label: 'Right 1', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['rightAnswer2', 'text', null, { label: 'Right 2', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['rightAnswer3', 'text', null, { label: 'Right 3', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['rightAnswer4', 'text', null, { label: 'Right 4', required: true, visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['correctMatch1', 'select', [], { label: 'Match for Left 1', required: true, optionsFrom: () => ['rightAnswer1', 'rightAnswer2', 'rightAnswer3', 'rightAnswer4'], visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['correctMatch2', 'select', [], { label: 'Match for Left 2', required: true, optionsFrom: () => ['rightAnswer1', 'rightAnswer2', 'rightAnswer3', 'rightAnswer4'], visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['correctMatch3', 'select', [], { label: 'Match for Left 3', required: true, optionsFrom: () => ['rightAnswer1', 'rightAnswer2', 'rightAnswer3', 'rightAnswer4'], visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['correctMatch4', 'select', [], { label: 'Match for Left 4', required: true, optionsFrom: () => ['rightAnswer1', 'rightAnswer2', 'rightAnswer3', 'rightAnswer4'], visibleWhen: (values) => values.exerciseType === 'matching' }],
    ['listenAudioUrl', 'text', null, { label: 'Audio URL', required: true, uploadKind: 'audio', visibleWhen: (values) => values.exerciseType === 'listenChoose' }],
    ['hearAudioUrl', 'text', null, { label: 'Audio URL', required: true, uploadKind: 'audio', visibleWhen: (values) => values.exerciseType === 'typeWhatYouHear' }],
    ['trueFalseAnswer', 'select', ['true', 'false'], { label: 'Correct Answer', required: true, visibleWhen: (values) => values.exerciseType === 'trueFalse' }],
  ] },
  { key: 'achievements', label: 'Achievements', description: 'Milestones that motivate learners', icon: EmojiEventsOutlined, idField: 'achievementId', fields: [['title', 'text'], ['description', 'long'], ['iconUrl', 'text'], ['type', 'text'], ['requirement', 'number'], ['rewardXp', 'number'], ['rewardDiamonds', 'number'], ['status', 'boolean']] },
  { key: 'users', label: 'Users', description: 'Learners and progress tracking', icon: GroupOutlined, fields: [['displayName', 'text'], ['email', 'text'], ['role', 'text'], ['status', 'boolean']] },
];

export const getCollection = (key) => collections.find((item) => item.key === key) ?? collections[0];

export function collectionPath(config, values = {}) {
  if (!config.parents?.length) return [config.key];
  const path = [];
  for (const [field, parentCollection] of config.parents) {
    if (!values[field]) return null;
    path.push(parentCollection, values[field]);
  }
  path.push(config.key);
  return path;
}

export const fieldNames = (config) => config.fields.map(([name]) => name);
