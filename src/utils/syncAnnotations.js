import {renderPage} from '../UI/page';

let RENDER_OPTIONS = {};

/**
 * Performs a diff on old and new annotations, returning the newer ones
 *
 * @param oldAnnotations
 * @param newAnnotations
 * @return {*}
 */
function diff(oldAnnotations, newAnnotations) {
  if (!oldAnnotations || !newAnnotations) {
    return !oldAnnotations ? newAnnotations : [];
  }

  const changed = [];
  // FIXME: probably unnecessary loop
  newAnnotations
    .forEach(i => {
      const idx = oldAnnotations.findIndex(el => i.uuid === el.uuid);
      if (idx >= -1) {
        changed.push(i);
      }
    });

  return changed;
}

/**
 * Method to update the data in localstorage with the new annotations
 *
 * @param newAnnotations
 * @param isFirstSync
 * @return {Promise<any>}
 */
function updateAnnotations(newAnnotations, isFirstSync) {
  return new Promise((resolve, reject) => {
    try {
      // Read from localStorage
      let storedItems = [];
      if (!isFirstSync && localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`).length) {
        storedItems = JSON.parse(localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`));
      }

      // Fetch elements to be added or updated
      const changed = diff(storedItems, newAnnotations);

      // Write new data to localStorage
      storedItems = changed;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations`, JSON.stringify(storedItems));

      // Extract pages to be re-rendered
      const pagesToBeReloaded = changed
        .map(i => typeof i.page !== "undefined" ? i.page : -1)
        .sort()
        .filter((item, idx, arr) => (item !== -1) && (!idx || item !== arr[idx - 1]));

      resolve(pagesToBeReloaded);
    } catch (e) {
      reject(e);
    }
  })
}

/**
 * Reloads the pages of the PDF whose annotations changed
 *
 * @param pages
 */
function reloadPages(pages) {
  console.log('Updating pages: ', pages);
  return new Promise((resolve, reject) => {
    const promises = [];
    pages.forEach(page => {
      promises.push(renderPage(page, RENDER_OPTIONS));
    });
    return Promise.all(promises)
      .then(() => resolve())
      .catch(err => reject(err))
  });
}

/**
 * Updates the annotations for current document and re-renders modified pdf pages
 *
 * @param newAnnotations
 * @param renderOptions
 * @param isFirstSync
 */
export default function sync(newAnnotations, renderOptions, isFirstSync) {
  // Exposes current PDF config settings
  RENDER_OPTIONS = renderOptions;

  updateAnnotations(newAnnotations, isFirstSync)
    .then(reloadPages)
    .catch(err => {
      console.log('An error occurred: ', err);
    });
}