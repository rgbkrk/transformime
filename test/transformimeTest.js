var assert = require('chai').assert,
    Transformime = require('../lib/transformime').Transformime,
    DefaultRenderer = require('../lib/defaultrenderer').DefaultRenderer;


if(process) {
    //var document = (require('jsdom').jsdom)();
}


/**
 * Dummy Renderer for spying on
 */
var DummyRenderer = function(mimetype){
    this.mimetype = mimetype;
};

DummyRenderer.prototype.transform = function(data, doc) {
    var pre = doc.createElement('pre');

    this.lastData = data;
    this.lastDoc = doc;
    pre.textContent = data;
    return pre;
};

describe('Transformime defaults', function() {
    before(function() {
        this.document = document;
    });
    describe('default constructor', function() {
        before(function(){
            this.t = new Transformime();
        });
        it('should have default renderers', function() {
            assert(Array.isArray(this.t.renderers));
        });
        it('should have the DefaultRenderer as the fallbackRenderer', function() {
            assert(this.t.fallbackRenderer instanceof DefaultRenderer);
        });
    });
});

describe('Transformime', function() {
    beforeEach(function() {
        this.dummyRenderer1 = new DummyRenderer("transformime/dummy1");
        this.dummyRenderer2 = new DummyRenderer("transformime/dummy2");
        this.dummyRenderer3 = new DummyRenderer("transformime/dummy3");
        this.renderers = [
            this.dummyRenderer1,
            this.dummyRenderer2,
            this.dummyRenderer3
        ];
        this.t = new Transformime(this.renderers);
        this.document = document;
    });
    describe('transform', function() {
        it('should have called our DummyRender', function() {
            var elPromise = this.t.transform("dummy-data", "transformime/dummy1", this.document);

            return elPromise.then(function(el){
                assert.equal(this.dummyRenderer1.lastData, "dummy-data");
                assert.equal(this.dummyRenderer1.lastDoc, this.document);

                // el should be an HTMLElement, which only exists in jsdom or on a
                // real document.
                assert(el instanceof this.document.defaultView.HTMLElement);
            });

        });
        it('should fail when the mimetype is not known', function() {
            var elPromise = this.t.transform("my-data", "transformime/unknown", this.doc);

            return elPromise.catch(function(err) {
                assert.equal(err.message, 'Renderer for mimetype transformime/unknown not found.');
            });
        });
    });
    describe('getRenderer', function() {
        it('should get the right renderer for a given mimetype', function() {
            var renderer = this.t.getRenderer('transformime/dummy1');
            assert.equal(this.dummyRenderer1, renderer);
        });
        it('should return null with an unknown mimetype', function() {
            assert.isNull(this.t.getRenderer('cats/calico'), 'found a renderer when I shouldn\'t have');
        });
    });
    describe('transformRichest', function() {
        describe('should only render the "richest" of the renderers', function() {
            it('when called with all mimetypes in the mimebundle, only return lastmost', function() {
                var mimeBundle = {
                    'transformime/dummy1': 'dummy data 1',
                    'transformime/dummy2': 'dummy data 2',
                    'transformime/dummy3': 'dummy data 3'
                };

                var elPromise = this.t.transformRichest(mimeBundle, this.document);
                return elPromise.then( function(el) {
                    assert.isUndefined(this.dummyRenderer1.lastData);
                    assert.isUndefined(this.dummyRenderer2.lastData);
                    assert.equal(this.dummyRenderer3.lastData, "dummy data 3");
                });

            });
            it('when called with a lesser mimebundle, choose most rich', function() {
                var mimeBundle = {
                    'transformime/dummy1': 'dummy data 1',
                    'transformime/dummy2': 'dummy data 2'
                };

                var elPromise = this.t.transformRichest(mimeBundle, this.document);
                return elPromise.then( function(el) {
                    assert.isUndefined(this.dummyRenderer1.lastData);
                    assert.equal(this.dummyRenderer2.lastData, "dummy data 2");
                    assert.isUndefined(this.dummyRenderer3.lastData);
                });
            });
            it('when called with mimetypes it doesn\'t know, it uses supported mimetypes', function() {
                var mimeBundle = {
                    'video/quicktime': 'cat vid',
                    'transformime/dummy1': 'dummy data 1',
                    'application/x-shockwave-flash': 'flashy',
                    'application/msword': 'DOC',
                    'application/zip': 'zippy'
                };

                var elPromise = this.t.transformRichest(mimeBundle, this.document);
                return elPromise.then( function(el) {
                    assert.equal(this.dummyRenderer1.lastData, "dummy data 1");
                    assert.isUndefined(this.dummyRenderer2.lastData);
                    assert.isUndefined(this.dummyRenderer3.lastData);
                });
            });
            it.skip('when called with no supported mimetypes, it uses the fallbackRenderer', function(){
                var mimeBundle = {
                    'video/quicktime': 'cat vid',
                    'application/zip': 'zippy'
                };

                this.t.fallbackRenderer = new DummyRenderer("fallback/test");
                //TODO: Fix/determine the fallbackRenderer case

                var elPromise = this.t.transformRichest(mimeBundle, this.document);
                return elPromise.then( function(el) {
                    assert.equal(this.t.fallbackRenderer.lastData, '');
                });
            });
        });
    });
});
