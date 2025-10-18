const OPTIONAL_PROFILE_COLUMNS = ['profile_image_url', 'bio', 'recent_scrims', 'social_links'];

async function getAvailableColumns(supabase, columns = OPTIONAL_PROFILE_COLUMNS) {
  const available = new Set();

  await Promise.all(
    columns.map(async (column) => {
      const { error } = await supabase
        .from('players')
        .select(column)
        .limit(1);

      if (!error) {
        available.add(column);
      }
    })
  );

  return available;
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
  if (typeof input === 'object') {
    return input;
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' ? parsed : {};
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
