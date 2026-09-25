import { DeleteOutline, EditOutlined, MoreHoriz, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';

export default function DataTable({ config, rows, onEdit, onDelete, onNext, onPrevious, hasMore, canPrevious }) {
  const configuredColumnFields = new Set((config.columns ?? []).map(([field]) => field));
  const hiddenFields = new Set(config.tableHiddenFields ?? []);
  const columns = [
    ...config.fields
      .filter(([field, , , metadata = {}]) => !configuredColumnFields.has(field) && !hiddenFields.has(field) && !metadata.tableHidden)
      .map(([field, , , metadata = {}]) => [field, metadata.label ?? field.replace(/([A-Z])/g, ' $1')]),
    ...(config.columns ?? []),
  ];
  return (
    <Paper elevation={0} sx={{ border: '1px solid #e6e4de', overflowX: 'auto' }}>
      <Table sx={{ minWidth: 'max-content' }}>
        <TableHead><TableRow>{columns.map(([field, label]) => <TableCell key={field}>{label}</TableCell>)}<TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.length === 0 ? <TableRow><TableCell colSpan={columns.length + 1} sx={{ py: 8, textAlign: 'center' }}><Typography color="text.secondary">No records found yet.</Typography></TableCell></TableRow> : rows.map((row) => (
            <TableRow hover key={row.id}>{columns.map(([field]) => <TableCell key={field}><Typography noWrap sx={{ maxWidth: 220 }}>{String(row[field] ?? '—')}</Typography></TableCell>)}<TableCell align="right"><Tooltip title="Edit"><IconButton onClick={() => onEdit(row)}><EditOutlined /></IconButton></Tooltip><Tooltip title="Delete"><IconButton color="error" onClick={() => onDelete(row)}><DeleteOutline /></IconButton></Tooltip><IconButton><MoreHoriz /></IconButton></TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="table-footer"><Typography variant="body2" color="text.secondary">Showing {rows.length} records</Typography><div><IconButton disabled={!canPrevious} onClick={onPrevious}><ChevronLeft /></IconButton><IconButton disabled={!hasMore} onClick={onNext}><ChevronRight /></IconButton></div></div>
    </Paper>
  );
}
