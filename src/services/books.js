const OPEN_LIBRARY_ENDPOINT = 'https://openlibrary.org'
const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'cover_i',
  'editions',
  'editions.title',
  'editions.publish_date',
  'editions.cover_i'
].join(',')

// Use edition dates when Open Library provides them.
function getPublicationDate(book) {
  const editionDate = book.editions?.docs?.find(edition =>
    edition.publish_date?.length
  )?.publish_date
  const date = Array.isArray(editionDate)
    ? editionDate.find(Boolean)
    : editionDate

  return date || book.first_publish_year || ''
}

// Convert an Open Library result into the fields used by the interface.
function normalizeBook(book) {
  const publicationDate = getPublicationDate(book)
  const coverId =
    book.editions?.docs?.find(edition => edition.cover_i)?.cover_i ||
    book.cover_i

  return {
    id: book.key,
    title: book.editions?.docs?.[0]?.title || book.title || 'Untitled',
    authors: book.author_name || [],
    publicationDate: String(publicationDate || ''),
    year: String(publicationDate || '').match(/\d{4}/)?.[0] || 'Year unavailable',
    image: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : '',
    description: 'No description is available for this book.',
    infoLink: `https://openlibrary.org${book.key}`
  }
}

// Search Open Library and return one page of books.
export async function searchBooks(query, startIndex = 0) {
  const params = new URLSearchParams({
    q: query,
    limit: '12',
    offset: String(startIndex),
    fields: SEARCH_FIELDS
  })
  const response = await fetch(
    `${OPEN_LIBRARY_ENDPOINT}/search.json?${params}`
  )

  if (!response.ok) {
    throw new Error('Open Library is temporarily unavailable. Please try again.')
  }

  const data = await response.json()
  const docs = data.docs || []

  return {
    total: data.numFound || 0,
    books: docs.map(normalizeBook),
    nextIndex: startIndex + docs.length
  }
}

// Compare IDs and normalized title-author pairs to skip duplicate results.
export function sameBook(first, second) {
  if (!first || !second) return false
  if (first.id && second.id && first.id === second.id) return true

  const normalize = value =>
    String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, '')
  const firstAuthors = (first.authors || []).map(normalize).sort().join('|')
  const secondAuthors = (second.authors || []).map(normalize).sort().join('|')

  return Boolean(
    normalize(first.title) &&
      normalize(first.title) === normalize(second.title) &&
      firstAuthors &&
      firstAuthors === secondAuthors
  )
}
