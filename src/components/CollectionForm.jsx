import { useEffect, useRef, useState } from 'react';
import { Close, SaveOutlined } from '@mui/icons-material';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { listAllDocuments, uploadFileToCloudinary } from '../services/firestore';

const labelFor = (field) => {
  if (typeof field !== 'string') return field?.name ?? String(field);
  return ({
  multipleChoice: 'Multiple Choice',
  fillBlank: 'Fill in the Blank',
  listenChoose: 'Listen and Choose',
  typeWhatYouHear: 'Type What You Hear',
  trueFalse: 'True or False',
  rightAnswer1: 'Right 1',
  rightAnswer2: 'Right 2',
  rightAnswer3: 'Right 3',
  rightAnswer4: 'Right 4',
  }[field] ?? field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()));
};

export default function CollectionForm({ open, onClose, onSubmit, config, editing }) {
  const [values, setValues] = useState({});
  const [parentOptions, setParentOptions] = useState({});
  const [uploadingField, setUploadingField] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [recordingFields, setRecordingFields] = useState({});
  const cacheRef = useRef({});
  const mediaRecorderRef = useRef({});
  const mediaStreamRef = useRef({});

  useEffect(() => {
    if (!open) return;

    try {
      cacheRef.current = JSON.parse(window.localStorage.getItem('nativora-parent-cache') || '{}');
    } catch (error) {
      cacheRef.current = {};
    }

    const initialValues = editing ? { ...editing } : Object.fromEntries((config.fields ?? []).map(([field]) => [field, '']));
    if (config.key === 'vocabulary') initialValues.type = editing?.type ?? (editing?.sentence ? 'sentence' : 'word');
    if (config.key === 'exercises' && Array.isArray(editing?.sampleCorrectAnswers)) {
      editing.sampleCorrectAnswers.slice(0, 4).forEach((answer, index) => {
        initialValues[`sampleCorrectAnswer${index + 1}`] = answer;
      });
    }
    setValues(initialValues);
    setParentOptions({});
    setUploadingField('');
    setUploadError('');
    setUploadNotice('');
  }, [config, editing, open]);

  useEffect(() => {
    if (!open || !config.parents?.length) return;

    let cancelled = false;

    async function loadParentOptions() {
      const nextOptions = {};

      for (let index = 0; index < config.parents.length; index += 1) {
        const [field, parentKey] = config.parents[index];
        const path = [];
        let ready = true;

        for (let level = 0; level <= index; level += 1) {
          const [parentField, parentCollection] = config.parents[level];
          if (level === index) {
            path.push(parentKey);
            break;
          }

          const parentValue = values[parentField];
          if (!parentValue) {
            ready = false;
            break;
          }

          path.push(parentCollection, parentValue);
        }

        if (!ready) {
          nextOptions[field] = [];
          continue;
        }

        const cacheKey = JSON.stringify(path);
        const cachedEntry = cacheRef.current[cacheKey];
        const cachedDocs = Array.isArray(cachedEntry) ? cachedEntry : cachedEntry?.records;
        const cachedAt = Array.isArray(cachedEntry) ? 0 : (cachedEntry?.fetchedAt ?? 0);

        if (Array.isArray(cachedDocs) && Date.now() - cachedAt < 5 * 60 * 1000) {
          nextOptions[field] = cachedDocs;
          continue;
        }

        const documents = await listAllDocuments(path);
        if (cancelled) return;

        nextOptions[field] = documents;
        cacheRef.current[cacheKey] = { records: documents, fetchedAt: Date.now() };
        try {
          window.localStorage.setItem('nativora-parent-cache', JSON.stringify(cacheRef.current));
        } catch (error) {
          // ignore cache write failures
        }
      }

      if (!cancelled) setParentOptions(nextOptions);
    }

    loadParentOptions();
    return () => { cancelled = true; };
  }, [config, open, values]);

  function updateField(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      const fieldIndex = config.parents?.findIndex(([name]) => name === field) ?? -1;
      if (fieldIndex >= 0) {
        config.parents.slice(fieldIndex + 1).forEach(([name]) => {
          delete next[name];
        });
      }
      return next;
    });
  }

  async function uploadFieldFile(field, file, kind) {
    if (!file) return;
    setUploadingField(field);
    setUploadError('');
    setUploadNotice('');
    try {
      const { url, reused } = await uploadFileToCloudinary(file, kind);
      updateField(field, url);
      if (reused) setUploadNotice('This file was already uploaded and was reused to avoid duplication.');
    } catch (error) {
      setUploadError(error.message || 'File upload failed.');
    } finally {
      setUploadingField('');
    }
  }

  function stopRecordingForField(field) {
    const recorder = mediaRecorderRef.current[field];
    const stream = mediaStreamRef.current[field];

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current[field] = null;
    }

    setRecordingFields((current) => ({
      ...current,
      [field]: {
        ...(current[field] ?? {}),
        isRecording: false,
      },
    }));
  }

  async function startRecordingForField(field) {
    if (recordingFields[field]?.isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setUploadError('Recording is not supported on this device.');
      return;
    }

    try {
      setUploadError('');
      setUploadNotice('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const previewUrl = URL.createObjectURL(blob);

        setRecordingFields((current) => ({
          ...current,
          [field]: {
            ...(current[field] ?? {}),
            blob,
            previewUrl,
            isRecording: false,
          },
        }));

        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current[field] = null;
      };

      mediaRecorderRef.current[field] = recorder;
      mediaStreamRef.current[field] = stream;
      setRecordingFields((current) => ({
        ...current,
        [field]: {
          ...(current[field] ?? {}),
          blob: null,
          previewUrl: null,
          isRecording: true,
        },
      }));
      recorder.start();
    } catch (error) {
      setUploadError(error.message || 'Microphone access failed.');
    }
  }

  async function saveRecordingForField(field) {
    const recordedClip = recordingFields[field]?.blob;
    if (!recordedClip) return;

    setUploadingField(field);
    setUploadError('');
    setUploadNotice('');

    try {
      const { url, reused } = await uploadFileToCloudinary(recordedClip, 'audio');
      updateField(field, url);
      setRecordingFields((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
      if (reused) setUploadNotice('This audio was already uploaded and was reused to avoid duplication.');
    } catch (error) {
      setUploadError(error.message || 'Audio save failed.');
    } finally {
      setUploadingField('');
    }
  }

  function renderParent([field]) {
    const options = parentOptions[field] ?? [];
    return (
      <FormControl key={field} fullWidth sx={{ gridColumn: '1 / -1' }}>
        <InputLabel>{labelFor(field)}</InputLabel>
        <Select label={labelFor(field)} value={values[field] ?? ''} onChange={(event) => updateField(field, event.target.value)}>
          <MenuItem value=""><em>Select {labelFor(field).toLowerCase()}</em></MenuItem>
          {options.map((option) => <MenuItem key={option.id} value={option.id}>{option.name || option.title || option.dialectName || option.word || option.id}</MenuItem>)}
        </Select>
      </FormControl>
    );
  }

  function renderField([field, type, options, metadata = {}], index) {
    if (metadata.visibleWhen && !metadata.visibleWhen(values)) return null;

    const label = metadata.label ?? labelFor(field);
    const fullRow = type === 'long' || type === 'array' || field === 'description' || field === 'translation' || field === 'exampleSentence' || field === 'explanation';
    const required = metadata.required ?? index === 0;

    if (metadata.readOnly) return <TextField key={field} label={label} type="number" value={values[field] ?? 0} disabled fullWidth />;

    if (type === 'boolean') {
      return <FormControlLabel key={field} sx={{ alignSelf: 'center', ml: 0, mt: 0.5 }} control={<Checkbox checked={Boolean(values[field])} onChange={(event) => updateField(field, event.target.checked)} />} label={labelFor(field)} />;
    }

    if (type === 'select') {
      const fieldOptions = metadata.optionsFrom ? metadata.optionsFrom(values) : options;
      return (
        <FormControl key={field} fullWidth required={required} sx={{ gridColumn: fullRow ? '1 / -1' : undefined }}>
          <InputLabel>{label}</InputLabel>
          <Select label={label} value={values[field] ?? ''} onChange={(event) => updateField(field, event.target.value)}>
            <MenuItem value=""><em>Select {label.toLowerCase()}</em></MenuItem>
            {fieldOptions.map((option) => <MenuItem key={option} value={option}>{labelFor(option)}</MenuItem>)}
          </Select>
        </FormControl>
      );
    }

    const fieldValue = type === 'array' && Array.isArray(values[field]) ? values[field].join('\n') : (values[field] ?? '');
    const textField = <TextField label={label} type={type === 'number' ? 'number' : 'text'} value={fieldValue} onChange={(event) => updateField(field, type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} multiline={type === 'long' || type === 'array'} minRows={type === 'long' || type === 'array' ? 3 : undefined} slotProps={{ htmlInput: { min: metadata.min } }} required={required} fullWidth />;
    if (!metadata.uploadKind) return <Box key={field} sx={{ gridColumn: fullRow ? '1 / -1' : undefined }}>{textField}</Box>;

    const recordState = recordingFields[field] ?? {};
    const hasRecordedClip = Boolean(recordState.previewUrl || recordState.blob);

    return (
      <Box key={field} sx={{ gridColumn: fullRow ? '1 / -1' : undefined, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>{textField}</Box>
          <Button component="label" variant="outlined" disabled={uploadingField === field} sx={{ minHeight: 56, whiteSpace: 'nowrap' }}>
            {uploadingField === field ? 'Uploading...' : 'Upload file'}
            <input hidden type="file" accept={metadata.uploadKind === 'image' ? 'image/*' : 'audio/*'} onChange={(event) => { uploadFieldFile(field, event.target.files?.[0], metadata.uploadKind); event.target.value = ''; }} />
          </Button>
          {metadata.uploadKind === 'audio' ? (
            <Button
              type="button"
              variant={recordState.isRecording ? 'contained' : 'outlined'}
              color={recordState.isRecording ? 'error' : 'primary'}
              disabled={uploadingField === field}
              sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
              onPointerDown={() => startRecordingForField(field)}
              onPointerUp={() => stopRecordingForField(field)}
              onPointerLeave={() => { if (recordState.isRecording) stopRecordingForField(field); }}
              onPointerCancel={() => { if (recordState.isRecording) stopRecordingForField(field); }}
              onTouchStart={() => startRecordingForField(field)}
              onTouchEnd={() => stopRecordingForField(field)}
            >
              {recordState.isRecording ? 'Recording...' : 'Record'}
            </Button>
          ) : null}
        </Box>

        {hasRecordedClip ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pl: 0.5 }}>
            <audio controls src={recordState.previewUrl || ''} style={{ maxWidth: 260 }} />
            <Button type="button" variant="contained" size="small" onClick={() => { const audio = new Audio(recordState.previewUrl); audio.play(); }}>
              Play
            </Button>
            <Button type="button" variant="outlined" size="small" color="inherit" onClick={() => {
              if (recordState.previewUrl) URL.revokeObjectURL(recordState.previewUrl);
              setRecordingFields((current) => {
                const next = { ...current };
                delete next[field];
                return next;
              });
            }}>
              Cancel
            </Button>
            <Button type="button" variant="contained" size="small" color="success" onClick={() => saveRecordingForField(field)} disabled={uploadingField === field}>
              {uploadingField === field ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        ) : null}

        {uploadError && uploadingField === field ? <Typography color="error" variant="caption">{uploadError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
        {editing ? `Edit ${config.label.slice(0, -1)}` : `New ${config.label.slice(0, -1)}`}
        <IconButton onClick={onClose} aria-label="Close"><Close /></IconButton>
      </DialogTitle>
      <DialogContent>
        {uploadError && !uploadingField ? <Typography color="error" variant="body2" sx={{ mb: 1 }}>{uploadError}</Typography> : null}
        {uploadNotice ? <Typography color="success.main" variant="body2" sx={{ mb: 1 }}>{uploadNotice}</Typography> : null}
        <Box component="form" id="collection-form" sx={{ display: 'grid', gap: 2, pt: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
          {config.parents?.map(renderParent)}
          {config.fields.map(renderField)}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button form="collection-form" type="submit" variant="contained" startIcon={<SaveOutlined />} onClick={(event) => { event.preventDefault(); onSubmit(values); }}>
          Save record
        </Button>
      </DialogActions>
    </Dialog>
  );
}
