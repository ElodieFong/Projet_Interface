const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org'
const OPEN_LIBRARY_FIELDS =
  'key,title,author_name,first_publish_year,cover_i,subject,editions,editions.key,editions.title,editions.publish_date,editions.publishers,editions.number_of_pages,editions.cover_i'

// Return the first value when the API sends a list.
const firstValue = value =>
  Array.isArray(value) ? value.find(Boolean) || '' : value || ''

// Normalize text before comparing book titles and authors.
function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

// Match books by ID, or by title and authors when IDs differ.
export function sameBook(first, second) {
  if (!first || !second) return false
  if (first.id && second.id && first.id === second.id) return true

  const firstTitle = normalize(first.title)
  const secondTitle = normalize(second.title)
  const firstAuthors = (first.authors || [])
    .map(normalize)
    .filter(Boolean)
    .sort()
    .join('|')
  const secondAuthors = (second.authors || [])
    .map(normalize)
    .filter(Boolean)
    .sort()
    .join('|')

  return Boolean(
    firstTitle &&
      firstTitle === secondTitle &&
      firstAuthors &&
      firstAuthors === secondAuthors
  )
}

// Format publication dates for display.
export function formatPublicationDate(value) {
  if (!value) return ''

  const text = String(value)
  if (/^\d{4}$/.test(text)) return text

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = isoDate
    ? new Date(
        Date.UTC(
          Number(isoDate[1]),
          Number(isoDate[2]) - 1,
          Number(isoDate[3])
        )
      )
    : new Date(text)

  if (Number.isNaN(parsed.getTime())) return text

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(isoDate ? { timeZone: 'UTC' } : {})
  }).format(parsed)
}

// Convert an API search result into the app's book format.
function normalizeOpenLibraryBook(item) {
  const coverId = item.cover_i
  const edition =
    item.editions?.docs?.find(entry => entry.publish_date?.length) ||
    item.editions?.docs?.[0]
  const publicationDate =
    firstValue(edition?.publish_date) ||
    (item.first_publish_year ? String(item.first_publish_year) : '')

  return {
    id: item.key?.replace(/^\/works\//, '') || item.key,
    source: 'openlibrary',
    title: edition?.title || item.title || 'Untitled',
    authors: item.author_name || ['Unknown author'],
    publicationDate,
    year:
      publicationDate.match(/\d{4}/)?.[0] ||
      (item.first_publish_year ? String(item.first_publish_year) : 'Year unknown'),
    description: 'Open this book for more information.',
    categories: item.subject?.slice(0, 3) || [],
    pageCount: edition?.number_of_pages || null,
    publisher: firstValue(edition?.publishers),
    language: '',
    image: edition?.cover_i
      ? `https://covers.openlibrary.org/b/id/${edition.cover_i}-M.jpg`
      : coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : '',
    infoLink: item.key ? `https://openlibrary.org${item.key}` : ''
  }
}

// Search Open Library and return one page of results.
async function searchOpenLibrary(query, startIndex) {
  const params = new URLSearchParams({
    q: query,
    limit: '12',
    offset: String(startIndex),
    fields: OPEN_LIBRARY_FIELDS
  })
  const response = await fetch(
    `${OPEN_LIBRARY_ENDPOINT}/search.json?${params}`
  )

  if (!response.ok) {
    throw new Error('Open Library is temporarily unavailable.')
  }

  const data = await response.json()
  const docs = data.docs || []

  return {
    total: data.numFound || 0,
    books: docs.map(normalizeOpenLibraryBook),
    nextIndex: startIndex + docs.length
  }
}

export async function searchBooks(query, startIndex = 0) {
  return searchOpenLibrary(query, startIndex)
}

// Load full details for one book.
export async function getBook(id) {
  let response

  try {
    response = await fetch(
      `${OPEN_LIBRARY_ENDPOINT}/works/${encodeURIComponent(id)}.json`
    )
  } catch {
    // Try the search endpoint below.
  }

  if (!response?.ok) {
    const params = new URLSearchParams({
      q: `key:${id}`,
      limit: '1',
      fields: OPEN_LIBRARY_FIELDS
    })
    const fallback = await fetch(
      `${OPEN_LIBRARY_ENDPOINT}/search.json?${params}`
    )

    if (!fallback.ok) {
      throw new Error('Open Library could not load this book. Please try again.')
    }

    const data = await fallback.json()
    const match =
      (data.docs || []).find(book => book.key?.endsWith(id)) || data.docs?.[0]

    if (!match) {
      throw new Error('This book could not be found in Open Library.')
    }

    return {
      ...normalizeOpenLibraryBook(match),
      description: 'No description is available for this book.'
    }
  }

  const item = await response.json()
  const description =
    typeof item.description === 'string'
      ? item.description
      : item.description?.value
  const coverId = item.covers?.find(cover => cover > 0)
  let edition = null

  try {
    const editionsResponse = await fetch(
      `${OPEN_LIBRARY_ENDPOINT}/works/${encodeURIComponent(id)}/editions.json?limit=10`
    )

    if (editionsResponse.ok) {
      const editionsData = await editionsResponse.json()
      edition =
        editionsData.entries?.find(entry => entry.publish_date) ||
        editionsData.entries?.[0] ||
        null
    }
  } catch {
    // Work details still provide a first-publication date.
  }

  const publicationDate = edition?.publish_date || item.first_publish_date || ''
  const year = publicationDate.match(/\d{4}/)?.[0] || 'Year unavailable'
  const authors = await Promise.all(
    (item.authors || []).slice(0, 3).map(async ({ author }) => {
      if (!author?.key) return null

      try {
        const authorResponse = await fetch(
          `${OPEN_LIBRARY_ENDPOINT}${author.key}.json`
        )

        if (!authorResponse.ok) return null

        const authorData = await authorResponse.json()
        return authorData.name || null
      } catch {
        return null
      }
    })
  )
  const editionCoverId = edition?.covers?.find(cover => cover > 0)

  return {
    id,
    source: 'openlibrary',
    title: item.title || edition?.title || 'Untitled',
    authors: authors.filter(Boolean).length
      ? authors.filter(Boolean)
      : ['Unknown author'],
    publicationDate,
    year,
    description: description || 'No description is available for this book.',
    categories: item.subjects?.slice(0, 3) || [],
    pageCount: edition?.number_of_pages || null,
    publisher: firstValue(edition?.publishers),
    language: '',
    image: editionCoverId
      ? `https://covers.openlibrary.org/b/id/${editionCoverId}-L.jpg`
      : coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : '',
    infoLink: `https://openlibrary.org/works/${id}`
  }
}
