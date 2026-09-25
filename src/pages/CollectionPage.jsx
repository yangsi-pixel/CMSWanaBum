import { useEffect, useState } from 'react';
import { Add, LayersOutlined, Refresh } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, Typography } from '@mui/material';
import DataTable from '../components/DataTable';
import CollectionForm from '../components/CollectionForm';
import { countDocuments, createDocument, editDocument, listAllDocuments, migrateDialectLessons, removeDocument, syncDialectLessonCount } from '../services/firestore';
import { collectionPath } from '../data/collections';

export default function CollectionPage({ config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [parentValues, setParentValues] = useState({});
  const [parentOptions, setParentOptions] = useState({});
  const [dialectFilter, setDialectFilter] = useState('');
  const [lessonFilter, setLessonFilter] = useState('');
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState('');
  const [dialectOptions, setDialectOptions] = useState([]);
  const [lessonOptions, setLessonOptions] = useState([]);
  const activePath = collectionPath(config, parentValues);
  const exerciseTypeOptions = ['multipleChoice', 'fillBlank', 'matching', 'listenChoose', 'typeWhatYouHear', 'trueFalse'];

  async function loadParents(values = parentValues) {
    if (!config.parents?.length) return {};
    const nextOptions = {};
    for (let index = 0; index < config.parents.length; index += 1) {
      const [field] = config.parents[index];
      const path = [];
      let ready = true;
      for (let level = 0; level <= index; level += 1) {
        const [parentField, parentCollection] = config.parents[level];
        if (level === index) { path.push(parentCollection); break; }
        if (!values[parentField]) { ready = false; break; }
        path.push(parentCollection, values[parentField]);
      }
      nextOptions[field] = ready ? await listAllDocuments(path) : [];
    }
    setParentOptions(nextOptions);
    return nextOptions;
  }

  async function fetchRows() {
    if (config.key === 'dialects') {
      const dialects = await listAllDocuments(['dialects']);
      return Promise.all(dialects.map(async (dialect) => {
        await migrateDialectLessons(dialect.id);
        return { ...dialect, totalLessons: await syncDialectLessonCount(dialect.id), totalStories: await countDocuments(['dialects', dialect.id, 'stories']) };
      }));
    }
    if (config.key === 'stories') {
      const dialects = dialectFilter ? [{ id: dialectFilter }] : await listAllDocuments(['dialects']);
      return (await Promise.all(dialects.map(async (dialect) => (await listAllDocuments(['dialects', dialect.id, 'stories'])).map((row) => ({ ...row, __path: ['dialects', dialect.id, 'stories'], dialectId: dialect.id }))))).flat();
    }
    if (config.key === 'communityWords') {
      const dialects = dialectFilter ? [{ id: dialectFilter }] : await listAllDocuments(['dialects']);
      const communityWords = (await Promise.all(dialects.map(async (dialect) => (await listAllDocuments(['dialects', dialect.id, 'communityWords'])).map((row) => ({ ...row, __path: ['dialects', dialect.id, 'communityWords'], dialectId: dialect.id }))))).flat();

      const userIds = [...new Set(communityWords.map((row) => row.userId).filter(Boolean))];
      const allUsers = userIds.length === 0 ? [] : await listAllDocuments(['users']);
      const userMap = Object.fromEntries(allUsers.map((user) => [user.id || user.uid, user.displayName || user.name || 'Unknown user']));

      return communityWords.map((row) => ({
        ...row,
        audioPath: row.audioPath || row.audioUrl || '',
        userName: userMap[row.userId] || 'Unknown user',
      }));
    }
    if (config.key === 'lessons') {
      const dialects = dialectFilter ? [{ id: dialectFilter }] : await listAllDocuments(['dialects']);
      return (await Promise.all(dialects.map(async (dialect) => (await listAllDocuments(['dialects', dialect.id, 'lessons'])).map((row) => ({ ...row, __path: ['dialects', dialect.id, 'lessons'], dialectId: dialect.id }))))).flat();
    }
    if (config.key === 'vocabulary' || config.key === 'exercises') {
      const childCollection = config.key;
      const dialects = dialectFilter ? [{ id: dialectFilter }] : await listAllDocuments(['dialects']);
      const results = await Promise.all(dialects.map(async (dialect) => {
        const lessons = lessonFilter && dialectFilter ? [{ id: lessonFilter }] : await listAllDocuments(['dialects', dialect.id, 'lessons']);
        return (await Promise.all(lessons.map(async (lesson) => (await listAllDocuments(['dialects', dialect.id, 'lessons', lesson.id, childCollection])).map((row) => ({ ...row, __path: ['dialects', dialect.id, 'lessons', lesson.id, childCollection], dialectId: dialect.id, lessonId: lesson.id }))))).flat();
      }));
      let rows = results.flat();
      if (config.key === 'exercises' && exerciseTypeFilter) {
        rows = rows.filter((row) => row.exerciseType === exerciseTypeFilter);
      }
      if (config.key === 'vocabulary') {
        const lessonGroups = new Map();
        rows.forEach((row) => {
          const key = `${row.dialectId}:${row.lessonId}`;
          if (!lessonGroups.has(key)) lessonGroups.set(key, []);
          lessonGroups.get(key).push(row);
        });

        for (const groupRows of lessonGroups.values()) {
          groupRows.sort((left, right) => {
            const leftCreatedAt = left.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
            const rightCreatedAt = right.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
            return leftCreatedAt - rightCreatedAt;
          });

          let nextOrder = 1;
          for (const row of groupRows) {
            const currentOrder = Number(row.order);
            if (!Number.isFinite(currentOrder) || currentOrder < 1) {
              await editDocument(row.__path, row.id, { order: nextOrder });
              row.order = nextOrder;
            } else {
              nextOrder = Math.max(nextOrder, currentOrder + 1);
            }
            nextOrder = Math.max(nextOrder, Number(row.order || 0) + 1);
          }
        }

        rows.sort((left, right) => {
          const leftOrder = Number.isFinite(Number(left.order)) ? Number(left.order) : Number.MAX_SAFE_INTEGER;
          const rightOrder = Number.isFinite(Number(right.order)) ? Number(right.order) : Number.MAX_SAFE_INTEGER;
          return leftOrder - rightOrder;
        });
      }
      return rows;
    }
    return listAllDocuments([config.key]);
  }

  async function refreshRows() {
    setLoading(true);
    try { setRows(await fetchRows()); } catch (error) { setNotice(error.message); setRows([]); } finally { setLoading(false); }
  }

  useEffect(() => { setParentValues({}); setParentOptions({}); setDialectFilter(''); setLessonFilter(''); setExerciseTypeFilter(''); }, [config.key]);
  useEffect(() => { refreshRows(); }, [config.key, dialectFilter, lessonFilter, exerciseTypeFilter]);
  useEffect(() => { if (['lessons', 'stories', 'vocabulary', 'communityWords', 'exercises'].includes(config.key)) listAllDocuments(['dialects']).then(setDialectOptions); }, [config.key]);
  useEffect(() => { if (!dialectFilter || !['vocabulary', 'exercises'].includes(config.key)) setLessonOptions([]); else listAllDocuments(['dialects', dialectFilter, 'lessons']).then(setLessonOptions); }, [config.key, dialectFilter]);

  async function save(values) {
    try {
      const submittedValues = { ...values };
      config.fields.forEach(([field, , , metadata = {}]) => { if (metadata.readOnly) delete submittedValues[field]; });
      if (config.key === 'vocabulary') {
        submittedValues.type = values.type || 'word';
        const required = submittedValues.type === 'sentence' ? ['sentence', 'translation', 'audioUrl'] : ['word', 'translation', 'audioUrl', 'imageUrl'];
        const missing = required.find((field) => !String(submittedValues[field] ?? '').trim());
        if (missing) throw new Error(`${missing} is required.`);
        if (submittedValues.type === 'word' && submittedValues.imageUrl && !submittedValues.imageAudioUrl) {
          throw new Error('Word image requires a separate image audio URL so the image can play sound when clicked.');
        }
        if (submittedValues.type === 'sentence') ['word', 'imageUrl', 'imageAudioUrl', 'exampleSentence', 'exampleTranslation', 'exampleAudioUrl'].forEach((field) => delete submittedValues[field]);
        else delete submittedValues.sentence;
      }
      if (config.key === 'lessons' && !editing) {
        const dialectId = submittedValues.dialectId;
        if (!dialectId) throw new Error('Choose a dialect before saving the lesson.');
        const dialectLessons = await listAllDocuments(['dialects', dialectId, 'lessons']);
        const nextOrder = dialectLessons.reduce((maxOrder, lesson) => Math.max(maxOrder, Number(lesson.order) || 0), 0) + 1;
        submittedValues.order = nextOrder;
      }
      if (config.key === 'vocabulary' && !editing) {
        const { dialectId, lessonId } = submittedValues;
        if (!dialectId || !lessonId) throw new Error('Choose a dialect and lesson before saving the vocabulary item.');
        const lessonVocabulary = await listAllDocuments(['dialects', dialectId, 'lessons', lessonId, 'vocabulary']);
        const nextOrder = lessonVocabulary.reduce((maxOrder, item) => Math.max(maxOrder, Number(item.order) || 0), 0) + 1;
        submittedValues.order = nextOrder;
      }
      if (config.key === 'stories' && (submittedValues.coinsRequired === '' || submittedValues.coinsRequired == null || Number(submittedValues.coinsRequired) < 0)) throw new Error('Coins required to unlock must be 0 or greater.');
      if (config.key === 'communityWords') {
        submittedValues.wordOfTheDay = Boolean(values.wordOfTheDay);
        if (!submittedValues.audioPath && submittedValues.audioUrl) submittedValues.audioPath = submittedValues.audioUrl;
        delete submittedValues.audioUrl;
        if (submittedValues.wordOfTheDay) {
          const dialectId = submittedValues.dialectId;
          if (!dialectId) throw new Error('Choose a dialect before setting a community word of the day.');
          const allWords = await listAllDocuments(['dialects', dialectId, 'communityWords']);
          await Promise.all(allWords
            .filter((word) => (word.wordOfTheDay === true || word.wordOfTheDay === 'true') && (!editing || word.id !== editing.id))
            .map((word) => editDocument(['dialects', dialectId, 'communityWords'], word.id, { wordOfTheDay: false })));
        }
      }
      if (config.key === 'exercises') {
        const visibleFields = config.fields.filter(([, , , metadata = {}]) => !metadata.visibleWhen || metadata.visibleWhen(submittedValues));
        const missing = visibleFields.find(([field, , , metadata = {}]) => metadata.required && !String(submittedValues[field] ?? '').trim());
        if (missing) throw new Error(`${missing[0]} is required.`);
        if (['fillBlank', 'typeWhatYouHear'].includes(submittedValues.exerciseType)) {
          submittedValues.sampleCorrectAnswers = [1, 2]
            .map((number) => String(submittedValues[`sampleCorrectAnswer${number}`] ?? '').trim())
            .filter(Boolean);
          if (submittedValues.sampleCorrectAnswers.length === 0) {
            throw new Error('Acceptable answer 1 is required.');
          }
        }
        [1, 2].forEach((number) => delete submittedValues[`sampleCorrectAnswer${number}`]);
        config.fields.forEach(([field, , , metadata = {}]) => { if (metadata.visibleWhen && !metadata.visibleWhen(submittedValues)) delete submittedValues[field]; });
      }
      const path = collectionPath(config, submittedValues);
      if (!path) throw new Error('Choose every required parent record before saving.');
      if (editing) await editDocument(path, editing.id, submittedValues); else await createDocument(path, submittedValues, config.idField);
      if (config.key === 'lessons') await syncDialectLessonCount(path[1]);
      setNotice(editing ? 'Record updated.' : 'Record created.'); setDialog(false); setEditing(null); await refreshRows();
    } catch (error) { setNotice(error.message); }
  }

  async function destroy(row) {
    if (!window.confirm(`Delete ${row[config.fields[0][0]] || 'this record'}?`)) return;
    try { const path = row.__path || activePath; await removeDocument(path, row.id); if (config.key === 'lessons') await syncDialectLessonCount(row.dialectId || path[1]); setNotice('Record deleted.'); await refreshRows(); } catch (error) { setNotice(error.message); }
  }

  const Icon = config.icon;
  const showDialectFilter = ['lessons', 'stories', 'vocabulary', 'communityWords', 'exercises'].includes(config.key);
  const showLessonFilter = ['vocabulary', 'exercises'].includes(config.key);
  const showExerciseTypeFilter = config.key === 'exercises';
  const filterSelectSx = { minWidth: 168, '& .MuiInputBase-root': { background: '#fff', borderRadius: 6, minHeight: 36 } };

  return (
    <Box>
      <Box className="page-heading">
        <Box>
          <Box className="eyebrow">
            <Icon />
            <span>CONTENT LIBRARY / {config.label.toUpperCase()}</span>
          </Box>
          <Typography variant="h1">{config.label}</Typography>
          <Typography className="page-description">{config.description}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditing(null); loadParents(); setDialog(true); }}>
          Add {config.label.slice(0, -1)}
        </Button>
      </Box>

      <Box className="metric-strip">
        <Box>
          <Typography variant="caption">COLLECTION</Typography>
          <Typography variant="h3">{config.label}</Typography>
        </Box>
        <Box>
          <Typography variant="caption">STATUS</Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <span className="status-dot" />
            <Typography>Live in Firestore</Typography>
          </Stack>
        </Box>
        <Box>
          <Typography variant="caption">LAST SYNC</Typography>
          <Typography>
            Just now
            <IconButton size="small" onClick={refreshRows}><Refresh fontSize="small" /></IconButton>
          </Typography>
        </Box>
      </Box>

      {showDialectFilter && (
        <Box className="metric-strip" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', py: 1 }}>
          <FormControl size="small" sx={filterSelectSx}>
            <InputLabel>Dialect</InputLabel>
            <Select label="Dialect" value={dialectFilter} onChange={(event) => { setDialectFilter(event.target.value); setLessonFilter(''); }}>
              <MenuItem value=""><em>All dialects</em></MenuItem>
              {dialectOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.dialectName || option.name || option.id}</MenuItem>)}
            </Select>
          </FormControl>

          {showLessonFilter && (
            <FormControl size="small" sx={filterSelectSx}>
              <InputLabel>Lesson</InputLabel>
              <Select label="Lesson" value={lessonFilter} onChange={(event) => setLessonFilter(event.target.value)} disabled={!dialectFilter}>
                <MenuItem value=""><em>All lessons</em></MenuItem>
                {lessonOptions.map((option) => <MenuItem key={option.id} value={option.id}>{option.title || option.name || option.id}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          {showExerciseTypeFilter && (
            <FormControl size="small" sx={filterSelectSx}>
              <InputLabel>Exercise type</InputLabel>
              <Select label="Exercise type" value={exerciseTypeFilter} onChange={(event) => setExerciseTypeFilter(event.target.value)}>
                <MenuItem value=""><em>All types</em></MenuItem>
                {exerciseTypeOptions.map((option) => <MenuItem key={option} value={option}>{option.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Box>
      )}

      {(config.key === 'lessons' || config.key === 'stories') && (
        <Alert icon={<LayersOutlined />} severity="info" sx={{ mb: 3 }}>
          <b>Nested content enabled.</b> Choose the dialect before creating this item.
        </Alert>
      )}

      {loading ? (
        <Box className="loading"><CircularProgress /></Box>
      ) : (
        <DataTable config={config} rows={rows} onEdit={(row) => { setEditing(row); setDialog(true); }} onDelete={destroy} hasMore={false} canPrevious={false} />
      )}

      <CollectionForm open={dialog} onClose={() => { setDialog(false); setEditing(null); }} onSubmit={save} config={config} editing={editing} parentOptions={parentOptions} />

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice('')}>
        <Alert severity="success" onClose={() => setNotice('')} sx={{ width: '100%' }}>{notice}</Alert>
      </Snackbar>
    </Box>
  );
}
