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
  if (!newAnnotations || (!newAnnotations && !oldAnnotations)) {
    return [];
  } else if (!oldAnnotations) {
    return newAnnotations
      .filter(item => item.syncType === 'add')
      .map(i => i.data[2])
  }

  let annotationBuffer = oldAnnotations;
  const changed = [];

  newAnnotations
    .forEach(i => {

      const idx = annotationBuffer
        .map((el) => el.uuid)
        .indexOf(i.data[1]);

      switch (i.syncType) {
        case 'add':
          changed.push(i.data[2]);
          break;
        case 'edit':
          changed.push(i.data[2]);
          // Removing outdated annotation
          annotationBuffer.splice(idx, 1);
          break;
        case 'delete':
          // Removing annotation
          annotationBuffer.splice(idx, 1);
          // Removing comments linked to deleted annotation
          annotationBuffer = annotationBuffer.filter(item => typeof item.annotation === "undefined" || item.annotation !== i.data[1]);
          break;
      }
    });

  return changed.concat(annotationBuffer);
}

/**
 * Utility function to extract page numbers from an annotations array
 *
 * @param annotations
 * @return {*}
 */
function extractPageNumbers(annotations) {
  return annotations
    .map(i => typeof i.page !== "undefined" ? i.page : -1)
    .sort()
    .filter((item, idx, arr) => (item !== -1) && (!idx || item !== arr[idx - 1]));
}

/**
 * Method to update the data in localStorage with the new annotations
 *
 * @param newAnnotations
 * @param isFirstSync
 * @return {Promise<any>}
 */
function updateAnnotations(newAnnotations, isFirstSync) {
  return new Promise((resolve, reject) => {
    try {
      // Read from localStorage
      let pagesToBeReloaded = [];
      let storedItems = JSON.parse(localStorage.getItem(`${RENDER_OPTIONS.documentId}/annotations`));
      if (isFirstSync || typeof storedItems.length === "undefined") {
        if (typeof storedItems.length !== "undefined" && storedItems.length > 0) {
          pagesToBeReloaded = extractPageNumbers(storedItems);
        }
        storedItems = [];
      }

      // Fetch elements to be added or updated
      const updatedAnnotations = diff(storedItems, newAnnotations);

      // Write new data to localStorage
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/annotations`, JSON.stringify(updatedAnnotations));

      // Extract pages to be re-rendered only if it is not the first sync
      pagesToBeReloaded = extractPageNumbers(updatedAnnotations).concat(pagesToBeReloaded);

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
 * @return {Promise<any>}
 */
function reloadPages(pages) {
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
export function sync(newAnnotations, renderOptions, isFirstSync) {
  // Exposes current PDF config settings
  RENDER_OPTIONS = renderOptions;

  updateAnnotations(newAnnotations, isFirstSync)
    .then(reloadPages)
    .catch(err => {
      console.log('An error occurred: ', err);
    });
}

/**
 * Broadcast to the socket server the variations in the annotations of current document
 *
 * @param variationsObj
 */
export function broadcastVariations(variationsObj) {
  // TODO: send variationsObj to server, which will broadcast to all clients inside the related "room"
}