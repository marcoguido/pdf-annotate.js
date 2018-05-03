import { renderPage } from '../UI/page';

let RENDER_OPTIONS = {};

/**
 * Performs a diff on old and new annotations, returning the newer ones
 *
 * @param oldAnnotations
 * @param newAnnotations
 * @return {*}
 */
function diff(oldAnnotations, newAnnotations) {
  if (!oldAnnotations) {
    return newAnnotations;
  }
  const UUIDs = oldAnnotations
    .filter(el => typeof el.uuid !== "undefined")
    .map(el => el.uuid);
  return newAnnotations.filter(i => typeof i.uuid !== "undefined" && UUIDs.findIndex(el => i.uuid === el) === -1);
}

/**
 * Method to update the data in localstorage with the new annotations
 *
 * @param newAnnotations
 * @return {Promise<any>}
 */
function updateAnnotations(newAnnotations) {
  return new Promise((resolve, reject) => {
    try {
      // Read from localstorage
      if (!localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`).length) {
        localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations`, JSON.stringify('[]'));
      }
      let storedItems = JSON.parse(localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`));
      // Fetch elements to be added
      const toBeAddedAnnotations = diff(storedItems, newAnnotations);
      // Extract pages to be re-rendered
      const toBeRerendered = toBeAddedAnnotations
        .map(i => typeof i.page !== "undefined" ? i.page : -1)
        .sort()
        .filter((item, idx, arr) => (item !== -1) && (!idx || item !== arr[idx - 1]));
      // Write new data to localstorage
      storedItems = storedItems.concat(toBeAddedAnnotations);
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations`, JSON.stringify(storedItems));
      resolve(toBeRerendered);
    } catch (e) {
      reject(e);
    }
  })
}

/**
 * Updates the annotations for current document and re-renders modified pdf pages
 *
 * @param newAnnotations JSON object
 */
export default function sync(newAnnotations, renderOptions) {
  RENDER_OPTIONS = renderOptions;

  updateAnnotations(newAnnotations)
    .then(pages => {
      console.log('Updating those pages: ', pages);
      return new Promise((resolve, reject) => {
        const promises = [];
        pages.forEach(page => {
          promises.push(renderPage(page, renderOptions));
        });
        return Promise.all(promises)
          .then(values => resolve(values))
          .catch(err => reject(err))
      });
    })
    .catch(err => {
      console.log('An error occurred: ', err);
    });
}