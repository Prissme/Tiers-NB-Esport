const OPTIONAL_PROFILE_COLUMNS = ['profile_image_url', 'bio', 'recent_scrims', 'social_links'];
const OPTIONAL_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedOptionalColumns = null;
let cachedOptionalFetchedAt = 0;

function cloneToSet(columns, sourceSet) {
  if (!sourceSet) {
    return new Set();
  }

  return new Set(columns.filter((column) => sourceSet.has(column)));
}

async function getAvailableColumns(supabase, columns = OPTIONAL_PROFILE_COLUMNS) {
  const targetColumns = Array.isArray(columns) ? columns : OPTIONAL_PROFILE_COLUMNS;
  const now = Date.now();

  if (cachedOptionalColumns && now - cachedOptionalFetchedAt < OPTIONAL_CACHE_TTL_MS) {
    return cloneToSet(targetColumns, cachedOptionalColumns);
  }

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'players')
    .in('column_name', targetColumns);

  if (error || !Array.isArray(data)) {
    return cloneToSet(targetColumns, cachedOptionalColumns);
  }

  const discovered = new Set(
    data
      .map((row) => row.column_name)
      .filter((columnName) => targetColumns.includes(columnName))
  );

  cachedOptionalColumns = new Set(discovered);
  cachedOptionalFetchedAt = now;

  return new Set(discovered);
}

function normalizeScrims(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter((entry) => entry.length > 0);
      }
    } catch (err) {
      return input
        .split('\n')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }
  }
  return [];
}

function normalizeSocialLinks(input) {
  if (!input) return {};
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input;
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (err) {
      return {};
    }
  }
  return {};
}

function applyOptionalDefaults(record = {}, availableColumns = new Set()) {
  const result = { ...record };

  OPTIONAL_PROFILE_COLUMNS.forEach((column) => {
    if (!availableColumns.has(column)) {
      result[column] = column === 'recent_scrims' ? [] : column === 'social_links' ? {} : null;
      return;
    }

    if (column === 'recent_scrims') {
      result[column] = normalizeScrims(record[column]);
      return;
    }

    if (column === 'social_links') {
      result[column] = normalizeSocialLinks(record[column]);
      return;
    }

    result[column] = record[column] ?? null;
  });

  return result;
}

function filterPayloadForColumns(payload = {}, availableColumns = new Set()) {
  const filtered = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (!OPTIONAL_PROFILE_COLUMNS.includes(key)) {
      filtered[key] = value;
      return;
    }

    if (availableColumns.has(key)) {
      filtered[key] = value;
    }
  });

  return filtered;
}

module.exports = {
  OPTIONAL_PROFILE_COLUMNS,
  getAvailableColumns,
  normalizeScrims,
  normalizeSocialLinks,
  applyOptionalDefaults,
  filterPayloadForColumns,
};
