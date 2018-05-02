const filename = 'example.pdf'; // TODO: will be depending upon current file

/**
 * Performs a diff on old and new annotations, returning the newer ones
 *
 * @param oldAnnotations
 * @param newAnnotations
 * @return {*}
 */
function diff (oldAnnotations, newAnnotations) {
  if(!oldAnnotations) { return newAnnotations; }
  const differences = newAnnotations.filter(i => {
    return oldAnnotations.findIndex(i.uuid) === -1;
  });
  return differences;
}

export default function sync (newAnnotations) {
  if(!localStorage.getItem(`${filename}/annotations`).length) {
    localStorage.setItem(`${filename}/annotations`, []);
  }
  const storedItems = JSON.parse(localStorage.getItem(`${filename}/annotations`));
  const toBeAddedAnnotations = diff(storedItems, newAnnotations);

  //TODO: comments don't have pages. Make a distinct-like clause to avoid repetitions
  const reRenderTargetPages = toBeAddedAnnotations.map(i => i.page );

  storedItems.push(toBeAddedAnnotations);
  localStorage.setItem(`${filename}/annotations`, storedItems);
  // TODO: re-render changed pages inside reRenderTargetPages variable
}