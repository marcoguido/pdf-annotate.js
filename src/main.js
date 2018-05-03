import twitter from 'twitter-text';
import PDFJSAnnotate from '../';
import initColorPicker from '../shared/initColorPicker';
import sync from './utils/syncAnnotations';

const { UI } = PDFJSAnnotate;
const documentId = 'example.pdf';
let PAGE_HEIGHT;
let RENDER_OPTIONS = {
  documentId,
  pdfDocument: null,
  scale: parseFloat(localStorage.getItem(`${documentId}/scale`), 10) || 1.33,
  rotate: parseInt(localStorage.getItem(`${documentId}/rotate`), 10) || 0
};

PDFJSAnnotate.setStoreAdapter(new PDFJSAnnotate.LocalStoreAdapter());
PDFJS.workerSrc = './shared/pdf.worker.js';

// Render stuff
let NUM_PAGES = 0;
let renderedPages = {};
document.getElementById('content-wrapper').addEventListener('scroll', function (e) {
  let visiblePageNum = Math.round(e.target.scrollTop / PAGE_HEIGHT) + 1;
  let visiblePage = document.querySelector(`.page[data-page-number="${visiblePageNum}"][data-loaded="false"]`);
  if (visiblePage) {
    // Prevent invoking UI.renderPage on the same page more than once.
    if (!renderedPages[visiblePageNum]) {
      renderedPages[visiblePageNum] = true;
      setTimeout(function () {
        UI.renderPage(visiblePageNum, RENDER_OPTIONS);
      });
    }
  }
});

function render() {
  PDFJS.getDocument(RENDER_OPTIONS.documentId).then((pdf) => {
    RENDER_OPTIONS.pdfDocument = pdf;

    let viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    NUM_PAGES = pdf.pdfInfo.numPages;
    for (let i = 0; i < NUM_PAGES; i++) {
      let page = UI.createPage(i + 1);
      viewer.appendChild(page);
    }

    UI.renderPage(1, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
      let viewport = pdfPage.getViewport(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate);
      PAGE_HEIGHT = viewport.height;
    });
  });
}
render();

// Text stuff
(function () {
  let textSize;
  let textColor;

  function initText() {
    let size = document.querySelector('.toolbar .text-size');
    [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96].forEach((s) => {
      size.appendChild(new Option(s, s));
    });

    setText(
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/size`) || 10,
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/color`) || '#000000'
    );

    initColorPicker(document.querySelector('.text-color'), textColor, function (value) {
      setText(textSize, value);
    });
  }

  function setText(size, color) {
    let modified = false;

    if (textSize !== size) {
      modified = true;
      textSize = size;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/size`, textSize);
      document.querySelector('.toolbar .text-size').value = textSize;
    }

    if (textColor !== color) {
      modified = true;
      textColor = color;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/color`, textColor);

      let selected = document.querySelector('.toolbar .text-color.color-selected');
      if (selected) {
        selected.classList.remove('color-selected');
        selected.removeAttribute('aria-selected');
      }

      selected = document.querySelector(`.toolbar .text-color[data-color="${color}"]`);
      if (selected) {
        selected.classList.add('color-selected');
        selected.setAttribute('aria-selected', true);
      }

    }

    if (modified) {
      UI.setText(textSize, textColor);
    }
  }

  function handleTextSizeChange(e) {
    setText(e.target.value, textColor);
  }

  document.querySelector('.toolbar .text-size').addEventListener('change', handleTextSizeChange);

  initText();
})();

// Pen stuff
(function () {
  let penSize;
  let penColor;

  function initPen() {
    let size = document.querySelector('.toolbar .pen-size');
    for (let i = 0; i < 20; i++) {
      size.appendChild(new Option(i + 1, i + 1));
    }

    setPen(
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/size`) || 1,
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/color`) || '#000000'
    );

    initColorPicker(document.querySelector('.pen-color'), penColor, function (value) {
      setPen(penSize, value);
    });
  }

  function setPen(size, color) {
    let modified = false;

    if (penSize !== size) {
      modified = true;
      penSize = size;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/size`, penSize);
      document.querySelector('.toolbar .pen-size').value = penSize;
    }

    if (penColor !== color) {
      modified = true;
      penColor = color;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/color`, penColor);

      let selected = document.querySelector('.toolbar .pen-color.color-selected');
      if (selected) {
        selected.classList.remove('color-selected');
        selected.removeAttribute('aria-selected');
      }

      selected = document.querySelector(`.toolbar .pen-color[data-color="${color}"]`);
      if (selected) {
        selected.classList.add('color-selected');
        selected.setAttribute('aria-selected', true);
      }
    }

    if (modified) {
      UI.setPen(penSize, penColor);
    }
  }

  function handlePenSizeChange(e) {
    setPen(e.target.value, penColor);
  }

  document.querySelector('.toolbar .pen-size').addEventListener('change', handlePenSizeChange);

  initPen();
})();

// Toolbar buttons
(function () {
  let tooltype = localStorage.getItem(`${RENDER_OPTIONS.documentId}/tooltype`) || 'cursor';
  if (tooltype) {
    setActiveToolbarItem(tooltype, document.querySelector(`.toolbar button[data-tooltype=${tooltype}]`));
  }

  function setActiveToolbarItem(type, button) {
    let active = document.querySelector('.toolbar button.active');
    if (active) {
      active.classList.remove('active');

      switch (tooltype) {
        case 'cursor':
          UI.disableEdit();
          break;
        case 'draw':
          UI.disablePen();
          break;
        case 'text':
          UI.disableText();
          break;
        case 'point':
          UI.disablePoint();
          break;
        case 'area':
        case 'highlight':
        case 'strikeout':
          UI.disableRect();
          break;
      }
    }

    if (button) {
      button.classList.add('active');
    }
    if (tooltype !== type) {
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/tooltype`, type);
    }
    tooltype = type;

    switch (type) {
      case 'cursor':
        UI.enableEdit();
        break;
      case 'draw':
        UI.enablePen();
        break;
      case 'text':
        UI.enableText();
        break;
      case 'point':
        UI.enablePoint();
        break;
      case 'area':
      case 'highlight':
      case 'strikeout':
        UI.enableRect(type);
        break;
    }
  }

  function handleToolbarClick(e) {
    if (e.target.nodeName === 'BUTTON') {
      setActiveToolbarItem(e.target.getAttribute('data-tooltype'), e.target);
    }
  }

  document.querySelector('.toolbar').addEventListener('click', handleToolbarClick);
})();

// Scale/rotate
(function () {
  function setScaleRotate(scale, rotate) {
    scale = parseFloat(scale, 10);
    rotate = parseInt(rotate, 10);

    if (RENDER_OPTIONS.scale !== scale || RENDER_OPTIONS.rotate !== rotate) {
      RENDER_OPTIONS.scale = scale;
      RENDER_OPTIONS.rotate = rotate;

      localStorage.setItem(`${RENDER_OPTIONS.documentId}/scale`, RENDER_OPTIONS.scale);
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/rotate`, RENDER_OPTIONS.rotate % 360);

      render();
    }
  }

  function handleScaleChange(e) {
    setScaleRotate(e.target.value, RENDER_OPTIONS.rotate);
  }

  function handleRotateCWClick() {
    setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate + 90);
  }

  function handleRotateCCWClick() {
    setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate - 90);
  }

  document.querySelector('.toolbar select.scale').value = RENDER_OPTIONS.scale;
  document.querySelector('.toolbar select.scale').addEventListener('change', handleScaleChange);
  document.querySelector('.toolbar .rotate-ccw').addEventListener('click', handleRotateCCWClick);
  document.querySelector('.toolbar .rotate-cw').addEventListener('click', handleRotateCWClick);
})();

// Clear toolbar button
(function () {
  function handleClearClick(e) {
    if (confirm('Are you sure you want to clear annotations?')) {
      for (let i = 0; i < NUM_PAGES; i++) {
        document.querySelector(`div#pageContainer${i + 1} svg.annotationLayer`).innerHTML = '';
      }

      localStorage.removeItem(`${RENDER_OPTIONS.documentId}/annotations`);
    }
  }
  document.querySelector('a.clear').addEventListener('click', handleClearClick);
})();

// Comment stuff
(function (window, document) {
  let commentList = document.querySelector('#comment-wrapper .comment-list-container');
  let commentForm = document.querySelector('#comment-wrapper .comment-list-form');
  let commentText = commentForm.querySelector('input[type="text"]');

  function supportsComments(target) {
    let type = target.getAttribute('data-pdf-annotate-type');
    return ['point', 'highlight', 'area'].indexOf(type) > -1;
  }

  function insertComment(comment) {
    let child = document.createElement('div');
    child.className = 'comment-list-item';
    child.innerHTML = twitter.autoLink(twitter.htmlEscape(comment.content));

    commentList.appendChild(child);
  }

  function handleAnnotationClick(target) {
    if (supportsComments(target)) {
      let documentId = target.parentNode.getAttribute('data-pdf-annotate-document');
      let annotationId = target.getAttribute('data-pdf-annotate-id');

      PDFJSAnnotate.getStoreAdapter().getComments(documentId, annotationId).then((comments) => {
        commentList.innerHTML = '';
        commentForm.style.display = '';
        commentText.focus();

        commentForm.onsubmit = function () {
          PDFJSAnnotate.getStoreAdapter().addComment(documentId, annotationId, commentText.value.trim())
            .then(insertComment)
            .then(() => {
              commentText.value = '';
              commentText.focus();
            });

          return false;
        };

        comments.forEach(insertComment);
      });
    }
  }

  function handleAnnotationBlur(target) {
    if (supportsComments(target)) {
      commentList.innerHTML = '';
      commentForm.style.display = 'none';
      commentForm.onsubmit = null;

      insertComment({ content: 'No comments' });
    }
  }

  UI.addEventListener('annotation:click', handleAnnotationClick);
  UI.addEventListener('annotation:blur', handleAnnotationBlur);
})(window, document);

var test = JSON.parse('[{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"67c7aa11-096b-4b46-baf0-02ce275c3cc1","page":1},{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"ea298afe-3aff-44b0-b0ab-31d619b98f75","page":1},{"type":"area","x":309,"y":412,"width":248,"height":129,"class":"Annotation","uuid":"c827fedb-03d3-479b-a943-943c87bb7426","page":1},{"class":"Comment","uuid":"0e3b880b-01ac-4d06-ba71-f27bef9cfa0a","annotation":"c827fedb-03d3-479b-a943-943c87bb7426","content":"bduibcduil"},{"type":"drawing","width":8,"color":"#65499D","lines":[[73,650],[76,650],[86,650],[102,650],[121,650],[135,650],[143,650],[149,650],[150,650],[150,653],[142,661],[134,666],[118,671],[104,675],[94,676],[87,676],[84,676],[83,673],[89,668],[109,661],[123,659],[137,659],[146,660],[149,663],[151,666],[151,668],[150,669],[148,669],[146,669],[146,658],[154,645],[165,637],[189,629],[199,630],[209,642],[217,658],[221,671],[224,681],[226,689],[227,693],[228,694],[228,694],[232,694],[238,691],[248,688],[266,687],[280,687],[292,687],[300,688],[307,691],[311,692],[318,693],[323,693],[329,689],[336,671],[340,647],[342,615],[342,586],[340,563],[334,550],[327,542],[317,535],[302,531],[287,531],[261,535],[237,547],[215,564],[201,576],[190,587],[181,598],[175,609],[175,616],[179,624],[199,637],[232,654],[272,672],[309,689],[332,700],[356,715],[370,724],[382,733],[387,737],[392,740],[399,744],[406,745],[415,745],[428,742],[441,733],[454,721],[463,713],[471,707],[477,703],[480,701],[481,700],[482,700],[482,700],[482,700],[482,699],[482,699],[482,699],[482,698],[481,698]],"class":"Annotation","uuid":"04c82a1c-1d5f-41d4-8295-9878fb447a27","page":1},{"type":"drawing","width":8,"color":"#65499D","lines":[[260,419],[260,417],[268,406],[274,398],[296,372],[299,368],[300,367],[300,366],[300,365],[300,365],[295,368],[287,377],[280,391],[276,411],[276,443],[285,471],[304,499],[321,513],[338,524],[343,528],[350,531],[352,533],[347,535],[323,538],[279,541],[244,542],[215,542],[199,542],[187,540],[184,539],[184,537],[184,536],[186,536],[188,536],[188,536],[168,542],[134,554],[118,558],[96,561],[85,561],[80,554],[82,537],[96,511],[118,482],[133,464],[144,453],[156,445],[163,443],[166,443],[168,446],[170,451],[172,461],[173,475],[175,495],[179,511],[186,528],[198,542],[207,550],[219,557],[236,562],[240,562],[246,563],[247,563],[247,563],[245,564],[243,564],[240,565],[239,566],[241,566],[246,566],[259,560],[272,555],[285,548],[288,546],[292,544],[293,544],[293,545],[293,551],[294,559],[294,566],[294,572],[295,575]],"class":"Annotation","uuid":"3851fbe0-ad09-4176-93b1-85f4d87d030a","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[458,462],[458,467],[458,487],[458,519],[458,547],[458,564],[458,571],[458,573],[454,573],[427,544],[414,509],[403,454],[403,404],[412,366],[433,335],[462,308],[500,283],[527,270],[534,268],[544,264],[548,262],[549,262],[550,262],[550,262]],"class":"Annotation","uuid":"9ad2c479-08b3-43c5-91d5-c5e943d4d991","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[361,631],[359,637],[359,648],[359,658],[359,667],[359,673],[364,676],[372,677],[385,677],[399,677],[412,676],[431,672],[442,669],[455,667],[462,666],[468,666],[471,666],[473,668],[474,673],[474,674],[474,676],[473,676],[471,677],[466,677],[458,677],[447,677],[435,677],[424,677],[415,673],[409,660],[413,612],[425,585],[441,556],[453,537],[459,527],[467,516],[473,507],[479,500],[484,493],[488,488],[491,484],[493,481],[494,480],[495,479],[495,479],[495,479],[495,479],[495,479],[494,479]],"class":"Annotation","uuid":"421a3f36-1838-4bd7-a956-174670f54bf2","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[168,302],[172,301],[179,299],[186,295],[190,292],[197,288],[198,288],[199,288],[200,288],[200,288],[199,288]],"class":"Annotation","uuid":"43766510-3afd-4738-b2a1-4e1237a6d27e","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[125,226],[128,226],[135,231],[148,240],[164,252],[172,260],[172,260],[180,268],[182,271],[184,275],[187,282],[192,288],[196,292],[198,295],[200,297],[201,298],[202,299],[202,299],[202,299],[202,300],[203,301],[204,303],[205,303],[205,304],[205,305],[206,305],[206,306],[207,308],[209,311],[213,316],[217,321],[219,324],[222,327],[224,330],[225,332],[227,334],[229,336],[230,337],[230,338],[231,338],[231,339]],"class":"Annotation","uuid":"e6a93e88-3c76-4983-899d-06d3aa2bd86e","page":3},{"type":"textbox","size":18,"color":"#EF4437","content":"OH, HELL NO!","x":314,"y":360,"width":196,"height":29,"class":"Annotation","uuid":"31b77e99-e415-40f1-9c8e-dcd3870505f9","page":2},{"type":"drawing","width":5,"color":"#F0592B","lines":[[164,576],[164,575],[164,564],[172,558],[196,549],[221,547],[250,547],[281,547],[313,550],[338,562],[351,575],[356,585],[358,595],[355,607],[310,613],[240,613],[186,596],[143,574],[123,559],[118,544],[128,531],[160,513],[206,498],[231,493],[284,491],[304,491],[315,491],[321,492],[323,493],[321,493],[275,475],[242,458],[202,430],[178,410],[153,391],[142,386],[121,377],[100,370],[81,363],[66,355],[58,346],[51,328],[54,291],[70,266],[86,249],[107,232],[123,223],[140,216],[156,212],[179,210],[199,210],[222,215],[248,222],[274,229],[303,237],[313,240],[320,242],[323,243],[323,245],[303,252],[275,262],[249,272],[201,293],[188,302],[182,310],[180,315],[182,329],[190,340],[197,349],[207,366],[211,376],[215,391],[217,400],[218,409],[219,413],[220,415],[221,415],[233,411],[242,405],[255,391],[264,379],[270,370],[279,356],[286,344],[292,331],[298,319],[304,311],[312,303],[319,297],[332,293],[355,293],[373,294],[394,302],[433,327],[466,367],[477,392],[483,405],[485,413],[487,422],[488,428],[488,432],[486,437],[482,442],[473,451],[453,462],[424,470],[394,475],[358,476],[337,477],[317,477],[302,477],[287,473],[282,471],[276,469],[272,466],[269,464],[266,461],[264,459],[263,457],[262,456],[261,454],[261,453],[261,452],[261,451],[261,450],[261,449],[261,448],[261,447],[261,447],[261,447],[261,446],[261,446],[261,444],[261,441],[261,438],[261,436],[261,435],[261,435],[261,435],[262,435],[262,435],[262,436],[262,436],[262,436]],"class":"Annotation","uuid":"9c62e099-4fb3-43b7-8dea-89a35bc2500f","page":2},{"type":"drawing","width":5,"color":"#F0592B","lines":[[508,610],[505,610],[498,610],[487,610],[467,610],[439,610],[428,610],[421,610],[416,610],[412,611],[410,614],[408,619],[406,625],[406,631],[406,637],[406,642],[411,646],[421,651],[442,657],[459,659],[479,660],[492,661],[511,661],[527,661],[543,660],[556,657],[567,655],[577,652],[581,650],[585,649],[586,647],[587,647],[587,645],[587,643],[586,641],[585,639],[582,635],[576,630],[570,623],[559,616],[552,611],[544,607],[532,603],[529,602],[527,602],[525,602],[523,602],[522,602],[520,602],[517,602],[514,603],[512,603],[510,604],[508,605],[504,607],[504,608],[503,609],[503,609],[502,610],[503,610],[504,609],[507,609],[510,609],[517,609],[525,608],[533,607],[538,606],[544,605],[549,603],[552,602],[554,600],[555,598],[556,597],[556,596],[556,594],[556,593],[555,592],[553,590],[546,587],[537,583],[529,580],[519,576],[512,572],[506,570],[495,568],[488,567],[480,567],[472,567],[464,567],[458,569],[454,571],[451,573],[447,576],[444,578],[441,581],[438,583],[435,586],[433,588],[432,590],[431,591],[431,592],[431,593],[431,595],[433,597],[437,600],[439,602],[443,604],[446,606],[449,607],[454,609],[456,609],[458,609],[458,609],[459,609],[459,609],[460,609],[459,609],[458,609],[455,608],[447,601],[439,595],[433,591],[428,587],[426,585],[423,581],[421,576],[421,573],[421,570],[423,568],[426,566],[429,566],[433,566],[438,566],[443,566],[449,566],[453,566],[458,567],[461,567],[464,568],[465,568],[466,568],[467,568],[466,568],[466,568],[466,568],[466,568],[465,568],[465,568],[464,567],[463,566],[461,564],[460,562],[458,560],[457,558],[456,555],[456,553],[456,550],[457,546],[461,544],[468,541],[478,538],[490,536],[504,534],[517,534],[530,534],[557,540],[564,543],[566,545],[569,549],[569,550],[569,552],[569,553],[567,554],[564,556],[558,557],[553,558],[547,558],[535,559],[530,559],[524,559],[520,559],[516,557],[513,557],[511,556],[509,556],[508,555],[507,555],[506,554],[506,554],[506,554],[506,554],[506,555],[505,555],[505,555],[504,556],[502,557],[501,558],[498,561],[497,562],[496,564],[495,565],[494,565],[494,566],[494,566],[494,566],[495,566],[495,566],[495,566],[495,565],[495,563],[494,555],[493,550],[492,545],[492,539],[492,533],[492,527],[492,524],[493,521],[494,520],[495,518],[495,518],[495,517],[495,517],[495,518],[495,518],[495,519],[494,520],[494,521],[494,521],[494,521],[494,521],[494,521],[494,520],[494,519],[494,518],[494,517],[494,515],[495,512],[495,509],[496,507],[497,505],[498,504],[499,502],[500,501],[500,499],[501,499],[502,498],[503,497],[503,497],[505,497],[506,496],[507,496],[509,496],[511,496],[512,495],[515,495],[517,494],[518,494],[520,494],[522,494],[524,494],[525,495],[527,498],[528,500],[528,503],[529,505],[529,509],[529,511],[529,514],[528,516],[526,517],[525,518],[524,519],[522,521],[519,522],[518,523],[515,524],[514,524],[514,524],[514,523],[514,522],[514,521],[514,519],[514,518],[514,517],[514,515],[514,514],[515,511],[516,508],[518,505],[520,501],[521,499],[522,497],[523,495],[524,494],[524,493],[524,493],[524,493],[524,493],[524,493],[524,494],[524,494],[524,495],[523,497],[522,499],[521,501],[518,508],[515,512],[513,516],[511,518],[507,524],[505,527],[503,530],[501,533],[500,536],[499,537],[498,539],[497,539],[497,540],[497,540],[497,540],[497,540],[497,539],[497,538]],"class":"Annotation","uuid":"915b3378-5b00-43a0-8262-4958f7f7b30e","page":2},{"type":"drawing","width":3,"color":"#000000","lines":[[514,434],[514,434],[515,434],[517,434],[520,435],[520,436],[520,437],[520,438],[520,438],[518,438],[515,438],[514,438],[512,437],[511,437],[511,437],[511,436],[511,436],[511,436],[512,436],[512,436],[512,435],[513,435],[513,435],[513,436],[513,436],[512,436],[512,436],[512,435],[511,435],[511,434],[509,432],[509,430],[508,428],[508,427],[507,424],[507,422],[507,421],[508,421],[509,421],[510,421],[512,421],[514,421],[515,422],[515,423],[516,424],[516,424],[516,425],[516,425],[516,426],[516,427],[515,428],[515,429],[514,431],[513,432],[512,433],[512,434],[511,435],[511,435],[511,436],[511,437],[511,439],[511,440],[511,441],[511,442],[511,442],[512,443],[512,443],[513,443],[513,443],[514,443],[514,443],[515,444],[516,444],[516,444],[516,444],[517,444],[517,444],[518,444],[518,444],[519,444],[519,444],[519,444],[519,443],[519,443],[518,442],[517,441],[517,440],[516,440],[515,439],[515,439],[514,438],[513,438],[512,437],[512,437],[512,436]],"class":"Annotation","uuid":"adfc2db2-27c7-4148-a642-05b1a4e40a05","page":2},{"type":"drawing","width":3,"color":"#000000","lines":[[554,457],[555,456],[555,456],[556,455],[556,455],[556,455],[555,455],[555,455],[555,455],[555,455],[555,455],[555,456],[555,456],[556,456],[557,456],[558,454],[559,452],[559,449],[559,446],[559,446],[559,446],[558,446],[558,446],[557,446],[557,446],[557,446],[557,447],[557,447],[557,447],[557,448],[557,449],[556,450],[556,451],[555,452],[555,452],[555,452],[555,452],[555,452],[555,451],[555,449],[555,447],[555,444],[555,443],[555,442],[555,441],[555,441],[555,441],[554,441],[553,440],[551,439],[549,437],[546,435],[544,432],[542,430],[542,428],[542,427],[542,425],[543,425],[547,425],[550,425],[554,425],[557,426],[560,428],[562,430],[563,432],[563,433],[563,434],[563,436],[563,437],[562,438],[561,439],[560,440],[559,440],[558,441],[557,441],[557,442],[556,442],[556,442],[556,442],[556,442],[556,443],[556,443],[556,444],[556,445],[555,445],[555,446],[555,447],[555,448],[555,449],[555,451],[555,452],[555,453],[555,454],[555,454],[555,455],[555,456],[555,456],[556,456],[556,457],[556,457],[556,457],[556,457],[556,458],[556,459],[556,461],[556,462],[556,463],[556,463],[556,464],[556,464],[556,464],[557,464],[557,464],[558,464],[559,464],[559,464],[560,464],[561,464],[561,464],[562,463],[562,463],[562,462],[563,461],[563,460],[564,459],[564,458],[564,458],[564,458],[564,458],[564,457],[563,456],[562,455],[561,454],[560,454],[559,453],[559,453],[559,453],[558,453],[558,453]],"class":"Annotation","uuid":"49ac46e7-ca8a-419d-b5a0-98f31f3195dc","page":2},{"type":"drawing","width":3,"color":"#000000","lines":[[482,470],[482,471],[482,473],[482,475],[482,477],[484,478],[487,479],[489,479],[491,479],[492,479],[492,479],[493,478],[493,478],[493,478],[493,477],[492,477],[491,477],[491,477],[491,477],[491,477],[491,477],[491,476],[491,475],[491,475],[490,474],[489,474],[488,474],[488,474],[487,474],[488,474],[488,474],[488,474],[488,473],[488,473],[488,473],[487,473],[486,473],[485,473],[485,473],[485,473],[485,473],[486,473],[486,473],[487,473],[487,473],[486,473],[485,472],[484,472],[484,472],[483,472],[483,472],[483,471],[483,471],[483,470],[483,470],[483,469],[483,468],[483,467],[482,466],[481,465],[480,463],[479,463],[478,461],[476,460],[475,459],[474,458],[474,457],[474,456],[474,456],[474,455],[474,455],[475,455],[476,455],[477,455],[480,455],[481,455],[483,456],[487,459],[487,460],[487,460],[487,461],[487,461],[487,461],[487,462],[487,463],[487,464],[487,464],[487,465],[487,465],[487,466],[487,467],[487,467],[487,468],[487,469],[487,470],[487,471],[487,472],[487,474],[487,475],[487,475],[487,477],[487,477],[486,478],[486,479],[486,480],[486,480],[486,482],[486,482],[486,483],[486,483],[486,484],[486,484],[486,485],[486,485],[486,485],[486,485],[487,485],[487,485],[488,485],[489,485],[490,485],[490,485],[491,485],[491,485],[491,485],[491,485],[492,485],[492,485],[493,484],[493,484],[493,484],[493,484],[493,483],[493,483],[493,482],[493,482],[492,481],[492,481],[492,480],[491,480],[491,479],[490,479],[490,479],[490,479],[490,479],[489,479],[489,479],[489,479],[488,478],[488,478],[487,477],[487,477],[487,477],[486,476],[486,476],[486,476],[486,475],[485,475],[485,475],[485,474]],"class":"Annotation","uuid":"c7a39bab-4b00-4d53-81d7-274c75d59635","page":2},{"type":"drawing","width":3,"color":"#000000","lines":[[560,509],[561,508],[561,507],[562,506],[562,506],[562,505],[562,504],[561,503],[560,503],[559,503],[559,503],[559,503],[560,505],[561,506],[562,507],[562,507],[563,507],[563,506],[563,505],[563,505],[563,505],[562,505],[561,505],[561,505],[561,505],[561,505],[561,505],[561,505],[561,503],[561,502],[561,501],[561,500],[560,500],[560,500],[559,500],[559,499],[558,497],[558,496],[558,495],[558,494],[558,493],[558,493],[558,492],[558,492],[558,491],[559,491],[560,491],[561,490],[563,490],[565,490],[566,490],[568,490],[570,490],[571,491],[571,491],[572,492],[572,492],[573,493],[573,493],[573,494],[573,494],[572,495],[571,496],[570,497],[569,498],[568,498],[568,498],[567,499],[567,499],[566,499],[566,499],[566,499],[566,499],[566,500],[565,500],[565,501],[565,501],[564,502],[563,503],[562,504],[562,505],[561,505],[560,506],[560,506],[560,507],[559,508],[559,508],[559,508],[559,508],[557,508],[557,507],[555,507],[554,507],[553,507],[553,507],[553,507],[552,507],[552,507],[552,508],[552,509],[552,510],[552,511],[553,512],[553,512],[554,513],[555,513],[557,514],[557,515],[558,515],[558,516],[559,516],[559,516],[559,516],[559,516],[560,516],[560,516],[560,516],[561,516],[561,516],[562,515],[562,514],[563,513],[563,512],[564,511],[564,510],[564,510],[564,510],[564,509],[564,509],[564,509],[563,508],[563,508],[562,507],[562,506],[561,506],[561,505],[561,505]],"class":"Annotation","uuid":"4e754e51-e2d8-4db8-b0e5-555f00b72443","page":2}]');
document.addEventListener('test', (e) => {
  console.log('Intercepted sync event trigger');
  sync(test, RENDER_OPTIONS);
});