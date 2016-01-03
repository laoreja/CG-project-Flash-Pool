/**
 * Created by Loy on 1/2/16.
 */

window.GL = {};

window.GL.gl = null;
window.GL.shaderProgram = null;
window.GL.mvMatrix = mat4.create();
window.GL.mvMatrixStack = [];
window.GL.pMatrix = mat4.create();
window.GL.lastTime = 0;
window.GL.radius = 0.3;
window.GL.ballVertexPositionBuffer = null;
window.GL.ballVertexNormalBuffer = null;
window.GL.ballVertexTextureCoordBuffer = null;
window.GL.ballVertexIndexBuffer = null;
window.GL.tableVertexPositionBuffer = null;
window.GL.tableVertexNormalBuffer = null;
window.GL.tableVertexTextureCoordBuffer = null;
window.GL.tableVertexIndexBuffer = null;
window.GL.tableTexture = null;
window.GL.balls = [];
window.GL.keyPressed = {};
window.GL.eye = vec3.fromValues(0, 5, 12.7);
window.GL.center = vec3.fromValues(0, 0, 0);
window.GL.up = vec3.fromValues(0, 12.7, -5);
window.GL.step = 0.1;
window.GL.objTableVertexPositionBuffers = new Array(objTableParts);
window.GL.objTableVertexNormalBuffers = new Array(objTableParts);
window.GL.objTableVertexTextureCoordBuffers = new Array(objTableParts);
window.GL.objTableVertexIndexBuffers = new Array(objTableParts);
window.GL.updatingView = false;
window.GL.viewIndex = 0;
window.GL.deltaEye = vec3.create();
window.GL.deltaCenter = vec3.create();
window.GL.barLength = 0.005;
window.GL.increaseForce = true;

function initGL(canvas) {
    var gl;
    try {
        window.GL.gl = canvas.getContext("experimental-webgl");
        gl = window.GL.gl;
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function initShaders() {
    var gl = window.GL.gl;
    var shaderProgram;
    var fragmentShader = getShader(gl, "per-fragment-lighting-fs");
    var vertexShader = getShader(gl, "per-fragment-lighting-vs");

    window.GL.shaderProgram = gl.createProgram();
    shaderProgram = window.GL.shaderProgram;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

    //shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.ambientLightingColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientLightingColor");

    shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
    shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
    shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");

    //shaderProgram.pointLightingColor = gl.getUniformLocation(shaderProgram, "uPointLightingColor");

    shaderProgram.materialAmbientColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialAmbientColor");
    shaderProgram.materialDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialDiffuseColor");
    shaderProgram.materialSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialSpecularColor");
    shaderProgram.materialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
    shaderProgram.materialEmissiveColorUniform = gl.getUniformLocation(shaderProgram, "uMaterialEmissiveColor");

    shaderProgram.useTexturesUniform = gl.getUniformLocation(shaderProgram, "uUseTextures");
    shaderProgram.showSpecularHighlightsUniform = gl.getUniformLocation(shaderProgram, "uShowSpecularHighlights");

    shaderProgram.useColorUniform = gl.getUniformLocation(shaderProgram, "uUseColor");
    shaderProgram.fragColorUniform = gl.getUniformLocation(shaderProgram, "uFragColor");
    gl.uniform1i(shaderProgram.useColorUniform, false);
    gl.uniform4f(shaderProgram.fragColorUniform, 1.0, 1.0, 1.0, 1.0);

    if (!shaderProgram.useColorUniform) {
        console.log('Getting uniform useColorUniform failed.');
    }
    if (!shaderProgram.fragColorUniform) {
        console.log('Getting uniform fragColorUniform failed.');
    }
    if (!shaderProgram.mvMatrixUniform) {
        console.log('Getting uniform mvMatrixUniform failed.');
    }
    if (!shaderProgram.pMatrixUniform) {
        console.log('Getting uniform pMatrixUniform failed.');
    }
    if (!shaderProgram.samplerUniform) {
        console.log('Getting uniform samplerUniform failed.');
    }
    if (!shaderProgram.nMatrixUniform) {
        console.log('Getting uniform nMatrixUniform failed.');
    }
    if (!shaderProgram.ambientLightingColorUniform) {
        console.log('Getting uniform ambientLightingColorUniform failed.');
    }
    if (!shaderProgram.pointLightingLocationUniform) {
        console.log('Getting uniform pointLightingLocationUniform failed.');
    }
    if (!shaderProgram.pointLightingDiffuseColorUniform) {
        console.log('Getting uniform pointLightingDiffuseColorUniform failed.');
    }
    if (!shaderProgram.pointLightingSpecularColorUniform) {
        console.log('Getting uniform pointLightingSpecularColorUniform failed.');
    }
    if (!shaderProgram.materialAmbientColorUniform) {
        console.log('Getting uniform materialAmbientColorUniform failed.');
    }
    if (!shaderProgram.materialShininessUniform) {
        console.log('Getting uniform materialShininessUniform failed.');
    }
    if (!shaderProgram.materialEmissiveColorUniform) {
        console.log('Getting uniform materialEmissiveColorUniform failed.');
    }
    if (!shaderProgram.useTexturesUniform) {
        console.log('Getting uniform useTexturesUniform failed.');
    }
    if (!shaderProgram.materialDiffuseColorUniform) {
        console.log('Getting uniform materialDiffuseColorUniform failed.');
    }
    if (!shaderProgram.materialSpecularColorUniform) {
        console.log('Getting uniform materialSpecularColorUniform failed.');
    }
    if (!shaderProgram.showSpecularHighlightsUniform) {
        console.log('Getting uniform showSpecularHighlightsUniform failed.');
    }
}

function mvPushMatrix() {
    var mvMatrix = window.GL.mvMatrix;
    var mvMatrixStack = window.GL.mvMatrixStack;
    var copy = mat4.create();
    copy = mat4.clone(mvMatrix)
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    var mvMatrixStack = window.GL.mvMatrixStack;
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    window.GL.mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    var gl = window.GL.gl;
    var shaderProgram = window.GL.shaderProgram;
    var pMatrix = window.GL.pMatrix;
    var mvMatrix = window.GL.mvMatrix;
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);


    var normalMatrix = mat3.create();
    /*
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    */
    mat3.normalFromMat4(normalMatrix, mvMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

function setBallsLightingUniforms() {
    var gl = window.GL.gl;
    var shaderProgram = window.GL.shaderProgram;
    //gl.uniform3f(shaderProgram.ambientColorUniform, 0.2, 0.2, 0.2);
    //gl.uniform3f(shaderProgram.pointLightingColor, 0.7, 0.7, 0.7);
    gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform, 0.7, 0.7, 0.7);
    gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform, 0.7, 0.7, 0.7);
    gl.uniform3f(shaderProgram.pointLightingLocationUniform, 0, 10.0, 0);
    gl.uniform1i(shaderProgram.useTexturesUniform, true);
    gl.uniform3f(shaderProgram.ambientLightingColorUniform, 0.2, 0.2, 0.2);
    gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, true);
    gl.uniform3f(shaderProgram.materialAmbientColorUniform, 0.9, 0.9, 0.9);
    gl.uniform3f(shaderProgram.materialDiffuseColorUniform, 0.9, 0.9, 0.9);
    gl.uniform3f(shaderProgram.materialEmissiveColorUniform, 0, 0, 0);
    gl.uniform1f(shaderProgram.materialShininessUniform, 2);
    gl.uniform3f(shaderProgram.materialSpecularColorUniform, 0.5, 0.5, 0.5);
}

function drawScene() {
    var balls = window.GL.balls;

    renderForceBar();

    // Lighting parameters will be set for each part of the table.
    renderObjTable();

    // Set lighting parameters for other objects.
    setBallsLightingUniforms();
    //renderTable();
    for (var i = 0; i < balls.length; i++) {
        balls[i].render();
    }

}

function renderObjTable() {
    var gl = window.GL.gl;
    var shaderProgram = window.GL.shaderProgram;
    var pMatrix = window.GL.pMatrix;
    var mvMatrix = window.GL.mvMatrix;
    var eye = window.GL.eye;
    var center = window.GL.center;
    var up = window.GL.up;
    var objTableVertexPositionBuffers = window.GL.objTableVertexPositionBuffers;
    var objTableVertexNormalBuffers = window.GL.objTableVertexNormalBuffers;
    var objTableVertexTextureCoordBuffers = window.GL.objTableVertexTextureCoordBuffers;
    var objTableVertexIndexBuffers = window.GL.objTableVertexIndexBuffers;

    var tmpPerspective = mat4.create();
    var tmpLookat = mat4.create();
    mat4.perspective(tmpPerspective, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.lookAt(tmpLookat, eye, center, up);
    mat4.multiply(pMatrix, tmpPerspective, tmpLookat);

    mvPushMatrix();
    mat4.identity(mvMatrix);
    mat4.rotateY(mvMatrix, mvMatrix, Math.PI/2);
    mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(29, 25, 30));
    mat4.translate(mvMatrix, mvMatrix, vec3.fromValues(0.002, -0.092, 0.0025));

    gl.uniform3f(shaderProgram.ambientLightingColorUniform, 0.2, 0.2, 0.2);
    gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform, 0.8, 0.8, 0.8);
    gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform, 0.8, 0.8, 0.8);
    gl.uniform1i(shaderProgram.showSpecularHighlightsUniform, true);
    for (var i = 0; i < objTableParts; i++) {
        //gl.uniform3f(shaderProgram.ambientColorUniform, 0.2, 0.2, 0.2);
        //gl.uniform3f(shaderProgram.pointLightingColor, 0.7, 0.7, 0.7);
        //gl.uniform3f(shaderProgram.pointLightingLocationUniform, 0, 10.0, 0);
        gl.uniform3f(shaderProgram.materialAmbientColorUniform, poolMTLAmbient[i*3], poolMTLAmbient[i*3+1], poolMTLAmbient[i*3+2]);
        gl.uniform3f(shaderProgram.materialDiffuseColorUniform, poolMTLDiffuse[i*3], poolMTLDiffuse[i*3+1], poolMTLDiffuse[i*3+2]);
        gl.uniform3f(shaderProgram.materialSpecularColorUniform, poolMTLSpecular[i*3], poolMTLSpecular[i*3+1], poolMTLSpecular[i*3+2]);
        gl.uniform1f(shaderProgram.materialShininessUniform, 2);
        gl.uniform3f(shaderProgram.materialEmissiveColorUniform, 0, 0, 0);
        gl.uniform1i(shaderProgram.useTexturesUniform, false);

        gl.bindBuffer(gl.ARRAY_BUFFER, objTableVertexPositionBuffers[i]);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, objTableVertexPositionBuffers[i].itemSize, gl.FLOAT, false, 0, 0);

        gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);

        gl.bindBuffer(gl.ARRAY_BUFFER, objTableVertexNormalBuffers[i]);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, objTableVertexNormalBuffers[i].itemSize	, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objTableVertexIndexBuffers[i]);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, objTableVertexIndexBuffers[i].numItems, gl.UNSIGNED_SHORT, 0);
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    }
    mvPopMatrix();
}

function renderTable() {
    if (!window.GL.tableTexture) {
        console.log('table texture failure');
        return;
    }

    var gl = window.GL.gl;
    var mvMatrix = window.GL.mvMatrix;
    var pMatrix = window.GL.pMatrix;
    var eye = window.GL.eye;
    var center = window.GL.center;
    var up = window.GL.up;
    var tableVertexPositionBuffer = window.GL.tableVertexPositionBuffer;
    var tableVertexNormalBuffer = window.GL.tableVertexNormalBuffer;
    var tableVertexTextureCoordBuffer = window.GL.tableVertexTextureCoordBuffer;
    var tableVertexIndexBuffer = window.GL.tableVertexIndexBuffer;
    var texture = window.GL.tableTexture;
    var shaderProgram = window.GL.shaderProgram;

    var tmpPerspective = mat4.create();
    var tmpLookat = mat4.create();
    mat4.perspective(tmpPerspective, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.lookAt(tmpLookat, eye, center, up);
    mat4.multiply(pMatrix, tmpPerspective, tmpLookat);

    mvPushMatrix();
    mat4.identity(window.GL.mvMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tableVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, tableVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, tableVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tableVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, tableVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();
}

function animate() {
    var lastTime = window.GL.lastTime;
    var timeNow = new Date().getTime();

    window.GL.lastTime = timeNow;
}

function tick() {
    var gl = window.GL.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    requestAnimFrame(tick);
    updatePosition();
    updateView();
    handleKey();
    drawScene();
    animate();
}

function updatePosition() {
    var renderBalls = window.GL.balls;
    var physicalBalls = window.PHYSICS.ballBodies;

    window.PHYSICS.world.step(1/60);
    for (var i = 0; i < renderBalls.length && i < physicalBalls.length; i++) {
        renderBalls[i].setPos(physicalBalls[i].position.toArray());
        renderBalls[i].setQuat(physicalBalls[i].quaternion.toArray());
        if (physicalBalls[i].velocity.length() < 5) {
            physicalBalls[i].velocity = physicalBalls[i].velocity.scale(0.99);
            physicalBalls[i].angularVelocity = physicalBalls[i].angularVelocity.scale(0.99);
        }
        if (physicalBalls[i].velocity.length() < 1e-5) {
            physicalBalls[i].velocity.setZero();
            physicalBalls[i].angularVelocity.setZero();
        }
    }
}

function initTable() {
    initTableBuffers();

    var gl = window.GL.gl;
    var texture;
    window.GL.tableTexture = gl.createTexture();
    texture = window.GL.tableTexture;
    texture.image = new Image();
    texture.image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    texture.image.src = 'tex/surface.png';
}

function initObjTable() {
    
    var gl = window.GL.gl;
    var objTableVertexPositionBuffers = window.GL.objTableVertexPositionBuffers; 
    var objTableVertexNormalBuffers = window.GL.objTableVertexNormalBuffers;
    var objTableVertexTextureCoordBuffers = window.GL.objTableVertexTextureCoordBuffers;
    var objTableVertexIndexBuffers = window.GL.objTableVertexIndexBuffers; 

    var vertices = new Array(objTableParts);
    var vertexNormals = new Array(objTableParts);
    var textureCoords = new Array(objTableParts);
    var vertexIndices = new Array(objTableParts);
    
    for (var i = 0; i < objTableParts; i++) {
        objTableVertexPositionBuffers[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objTableVertexPositionBuffers[i]);
        vertices[i] = poolOBJVerts.slice(poolMTLFirst[i] * 3, (poolMTLFirst[i] + poolMTLCount[i]) * 3);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices[i]), gl.STATIC_DRAW);
        objTableVertexPositionBuffers[i].itemSize = 3;
        objTableVertexPositionBuffers[i].numItems = poolMTLCount[i];

        objTableVertexNormalBuffers[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objTableVertexNormalBuffers[i]);
        vertexNormals[i] = poolOBJNormals.slice(poolMTLFirst[i] * 3, (poolMTLFirst[i] + poolMTLCount[i]) * 3);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals[i]), gl.STATIC_DRAW);
        objTableVertexNormalBuffers[i].itemSize = 3;
        objTableVertexNormalBuffers[i].numItems = poolMTLCount[i];

        objTableVertexTextureCoordBuffers[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objTableVertexTextureCoordBuffers[i]);
        textureCoords[i] = poolOBJTexCoords.slice(poolMTLFirst[i] * 2, (poolMTLFirst[i] + poolMTLCount[i]) * 2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords[i]), gl.STATIC_DRAW);
        objTableVertexTextureCoordBuffers[i].itemSize = 2;
        objTableVertexTextureCoordBuffers[i].numItems = poolMTLCount[i];
        
        objTableVertexIndexBuffers[i] = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objTableVertexIndexBuffers[i]);

        vertexIndices[i] = new Array();
        for (var j = 0; j < poolMTLCount[i]; j++) {
            vertexIndices[i].push(j);
        }

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices[i]), gl.STATIC_DRAW);
        objTableVertexIndexBuffers[i].itemSize = 1;
        objTableVertexIndexBuffers[i].numItems = poolMTLCount[i];
    }
}

function webGLStart() {
    var canvas = document.getElementById("webgl-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var gl;
    initGL(canvas);
    initShaders();
    initBallBuffers();
    initTable();
    initObjTable();
    initBalls();
    initCannon();

    gl = window.GL.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    window.onkeydown = handleKeyDown;
    window.onkeyup = handleKeyUp;

    tick();
}

/**
 * Create a new ball object.
 * @param initPos array[3] of initial position
 * @param texUrl url to load the texture file
 * @constructor
 */
function Ball(initPos, texUrl) {
    this.pos = [0, 0, 0];
    this.pos[0] = initPos[0];
    this.pos[1] = initPos[1];
    this.pos[2] = initPos[2];
    this.quat = [0, 0, 0, 1];
    loadTexture(this, texUrl);
}

Ball.prototype.setPos = function (pos) {
    this.pos[0] = pos[0];
    this.pos[1] = pos[1];
    this.pos[2] = pos[2];
}

Ball.prototype.setQuat = function (quat) {
    this.quat[0] = quat[0];
    this.quat[1] = quat[1];
    this.quat[2] = quat[2];
    this.quat[3] = quat[3];
}

Ball.prototype.render = function () {
    if (!this.texture){
        return;
    }
    var gl = window.GL.gl;
    var mvMatrix = window.GL.mvMatrix;
    var pMatrix = window.GL.pMatrix;
    var eye = window.GL.eye;
    var center = window.GL.center;
    var up = window.GL.up;
    var ballVertexTextureCoordBuffer = window.GL.ballVertexTextureCoordBuffer;
    var ballVertexPositionBuffer = window.GL.ballVertexPositionBuffer;
    var ballVertexNormalBuffer = window.GL.ballVertexNormalBuffer;
    var ballVertexIndexBuffer = window.GL.ballVertexIndexBuffer;
    var shaderProgram = window.GL.shaderProgram;

    var tmpPerspective = mat4.create();
    var tmpLookat = mat4.create();
    mat4.perspective(tmpPerspective, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    mat4.lookAt(tmpLookat, eye, center, up);
    mat4.multiply(pMatrix, tmpPerspective, tmpLookat);

    mvPushMatrix();
    var tmpQuat = mat4.create();
    mat4.translate(mvMatrix, mvMatrix, [this.pos[0], this.pos[1], this.pos[2]]);
    mat4.fromQuat(tmpQuat, this.quat);
    mat4.multiply(window.GL.mvMatrix, mvMatrix, tmpQuat);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, ballVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, ballVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, ballVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, ballVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();
}

/**
 * Load texture from the given url.
 * @param texUrl the url to the texture file
 * @returns {*} the texture
 */
function loadTexture(ball, texUrl) {
    var that = ball;
    var gl = window.GL.gl;
    var texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);
        that.texture = texture;
    };
    texture.image.src = texUrl;
}

function initBallBuffers() {
    var gl = window.GL.gl;
    var radius = window.GL.radius;
    var latitudeBands = 30;
    var longitudeBands = 30;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    window.GL.ballVertexIndexBuffer = gl.createBuffer();
    window.GL.ballVertexNormalBuffer = gl.createBuffer();
    window.GL.ballVertexPositionBuffer = gl.createBuffer();
    window.GL.ballVertexTextureCoordBuffer = gl.createBuffer();

    var ballVertexNormalBuffer = window.GL.ballVertexNormalBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    ballVertexNormalBuffer.itemSize = 3;
    ballVertexNormalBuffer.numItems = normalData.length / 3;

    var ballVertexTextureCoordBuffer = window.GL.ballVertexTextureCoordBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    ballVertexTextureCoordBuffer.itemSize = 2;
    ballVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    var ballVertexPositionBuffer = window.GL.ballVertexPositionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, ballVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    ballVertexPositionBuffer.itemSize = 3;
    ballVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    var ballVertexIndexBuffer = window.GL.ballVertexIndexBuffer;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ballVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    ballVertexIndexBuffer.itemSize = 1;
    ballVertexIndexBuffer.numItems = indexData.length;
}

function initTableBuffers() {
    var gl = window.GL.gl;

    window.GL.tableVertexPositionBuffer = gl.createBuffer();
    window.GL.tableVertexNormalBuffer = gl.createBuffer();
    window.GL.tableVertexTextureCoordBuffer = gl.createBuffer();
    window.GL.tableVertexIndexBuffer = gl.createBuffer();

    var tableVertexPositionBuffer = window.GL.tableVertexPositionBuffer;
    var tableVertexNormalBuffer = window.GL.tableVertexNormalBuffer;
    var tableVertexTextureCoordBuffer = window.GL.tableVertexTextureCoordBuffer;
    var tableVertexIndexBuffer = window.GL.tableVertexIndexBuffer;

    var tableVertexPosition = [
        6.35, 0, 12.7,
        -6.35, 0, 12.7,
        -6.35, 0, -12.7,
        6.35, 0, -12.7
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tableVertexPosition), gl.STATIC_DRAW);
    tableVertexPositionBuffer.itemSize = 3;
    tableVertexPositionBuffer.numItems = 4;

    var tableVertexNormal = [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tableVertexNormal), gl.STATIC_DRAW);
    tableVertexNormalBuffer.itemSize = 3;
    tableVertexNormalBuffer.numItems = 4;

    var tableVertexTextureCoord = [
        0, 0,
        0, 4,
        4, 4,
        4, 0
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, tableVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tableVertexTextureCoord), gl.STATIC_DRAW);
    tableVertexTextureCoordBuffer.itemSize = 2;
    tableVertexTextureCoordBuffer.numItems = 4;

    var tableVertexIndex = [
        0, 1, 2,
        0, 2, 3
    ];
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tableVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tableVertexIndex), gl.STATIC_DRAW);
    tableVertexIndexBuffer.itemSize = 1;
    tableVertexIndexBuffer.numItems = 6;
}

function initBalls() {
    var balls = window.GL.balls;
    var inits = [
        [0, 0.3, 8.2, "tex/ball0.png"],
        [0.000000, 0.3, -6.650000, "tex/ball1.png"],
        [0.300000, 0.3, -7.169615, "tex/ball2.png"],
        [-0.300000, 0.3, -7.169615, "tex/ball3.png"],
        [0.600000, 0.3, -7.689230, "tex/ball4.png"],
        [0.000000, 0.3, -7.689230, "tex/ball5.png"],
        [-0.600000, 0.3, -7.689230, "tex/ball6.png"],
        [0.900000, 0.3, -8.208846, "tex/ball7.png"],
        [0.300000, 0.3, -8.208846, "tex/ball8.png"],
        [-0.300000, 0.3, -8.208846, "tex/ball9.png"],
        [-0.900000, 0.3, -8.208846, "tex/ball10.png"],
        [1.200000, 0.3, -8.728461, "tex/ball11.png"],
        [0.600000, 0.3, -8.728461, "tex/ball12.png"],
        [0.000000, 0.3, -8.728461, "tex/ball13.png"],
        [-0.600000, 0.3, -8.728461, "tex/ball14.png"],
        [-1.200000, 0.3, -8.728461, "tex/ball15.png"]
    ];

    for (var i = 0; i < inits.length; i++) {
        balls.push(new Ball([inits[i][0], inits[i][1], inits[i][2]], inits[i][3]));
    }
}

function renderForceBar() {
    var gl = window.GL.gl;
    var shaderProgram = window.GL.shaderProgram;
    var pMatrix = window.GL.pMatrix;
    var mvMatrix = window.GL.mvMatrix;
    var len = window.GL.barLength/10;

    if (len < 0.01) {
        return;
    }

    var vertices = [
        -0.8, -0.8, 0,
        -0.7, -0.8, 0,
        -0.8, -0.8+len, 0,
        -0.7, -0.8+len, 0
    ];

    gl.uniform1i(shaderProgram.useColorUniform, true);
    //gl.disableVertexAttribArray(shaderProgram.textureCoordAttribute);
    //gl.disableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    mat4.identity(pMatrix);
    mat4.identity(mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    buffer.itemSize = 3;
    buffer.numItem = 4;
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1i(shaderProgram.useColorUniform, false);
    //gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    //gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
}

function handleKeyUp(event) {
    window.GL.keyPressed[event.keyCode] = false;
    if (event.keyCode === 32) {
        window.GL.barLength = 0.005;
        window.GL.increaseForce = true;
    }
}

function handleKeyDown(event) {
    window.GL.keyPressed[event.keyCode] = true;
    if (event.keyCode === 48) {// key '0'
        if (window.GL.updatingView) {
            return;
        }
        enterTableView();
    }
    if (event.keyCode === 49) {// key '1'
        if (window.GL.updatingView) {
            return;
        }
        enterCueBallView();
    }
}

function updateView() {
    if (window.GL.updatingView) {
        console.log('updating view');
        var eye = window.GL.eye;
        var center = window.GL.center;
        var deltaEye = window.GL.deltaEye;
        var deltaCenter = window.GL.deltaCenter;
        vec3.add(eye, eye, deltaEye);
        vec3.add(center, center, deltaCenter);
    } else {
        return;
    }
    window.GL.viewIndex += 1;
    if (Math.abs(window.GL.viewIndex - 100) < 1e-3) {
        window.GL.updatingView = false;
        window.GL.viewIndex = 0;
    }
}

function enterTableView() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var dir = vec3.create();
    vec3.subtract(dir, eye, center);
    var targetCenter = vec3.fromValues(0, 0, 0);
    var targetEye = vec3.create();
    vec3.scale(targetEye, dir, 25/vec3.length(dir));
    var deltaEye = window.GL.deltaEye;
    var deltaCenter = window.GL.deltaCenter;
    vec3.subtract(deltaCenter, targetCenter, center);
    vec3.scale(deltaCenter, deltaCenter, 1e-2);
    vec3.subtract(deltaEye, targetEye, eye);
    vec3.scale(deltaEye, deltaEye, 1e-2);
    window.GL.updatingView = true;
}

function enterCueBallView() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var dir = vec3.create();
    var balls = window.GL.balls;
    vec3.subtract(dir, eye, center);
    var targetCenter = vec3.fromValues(balls[0].pos[0], balls[0].pos[1], balls[0].pos[2]);
    var targetEye = vec3.create();
    vec3.scale(dir, dir, 5/vec3.length(dir));
    vec3.add(targetEye, dir, targetCenter)
    var deltaEye = window.GL.deltaEye;
    var deltaCenter = window.GL.deltaCenter;
    vec3.subtract(deltaCenter, targetCenter, center);
    vec3.scale(deltaCenter, deltaCenter, 1e-2);
    vec3.subtract(deltaEye, targetEye, eye);
    vec3.scale(deltaEye, deltaEye, 1e-2);
    window.GL.updatingView = true;
}

function handleKey() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var keyPressed = window.GL.keyPressed;
    if (keyPressed[32]) { // space
        if (window.GL.barLength > 2) {
            window.GL.increaseForce = false;
        }
        if (window.GL.increaseForce) {
            window.GL.barLength *= 1.1;
        } else {
            window.GL.barLength /= 1.1;
        }
    }
    if (keyPressed[65]) { // key 'a'
        moveLeft();
    }
    if (keyPressed[68]) { // key 'd'
        moveRight();
    }
    if (keyPressed[87]) { // key 'w'
        moveUp();
    }
    if (keyPressed[83]) { // key 's'
        moveDown();
    }
    if (keyPressed[90]) { // key 'z'
        moveAhead();
    }
    if (keyPressed[67]) { // key 'c'
        moveBack();
    }
    if (keyPressed[73]) { // key 'i'
        pitchUp();
    }
    if (keyPressed[75]) { // key 'k'
        pitchDown();
    }
    if (keyPressed[74]) { // key 'j'
        yawLeft();
    }
    if (keyPressed[76]) { // key 'l'
        yawRight();
    }
    if (keyPressed[78]) { // key 'n'
        rollCounterclockwise();
    }
    if (keyPressed[77]) { // key 'm'
        rollClockwise();
    }
}

function moveLeft () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, dir);
    vec3.scale(delta, delta, -1);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, step);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function moveRight () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, dir);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, step);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function moveDown () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var up = window.GL.up;
    var step = window.GL.step;
    var delta = vec3.create();
    vec3.normalize(delta, up);
    vec3.scale(delta, delta, step);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function moveUp () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var up = window.GL.up;
    var step = window.GL.step;
    var delta = vec3.create();
    vec3.normalize(delta, up);
    vec3.scale(delta, delta, step);
    vec3.scale(delta, delta, -1);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function moveAhead () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.normalize(delta, dir);
    vec3.scale(delta, delta, step);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function moveBack () {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.normalize(delta, dir);
    vec3.scale(delta, delta, step);
    vec3.scale(delta, delta, -1);
    vec3.add(window.GL.eye, eye, delta);
    vec3.add(window.GL.center, center, delta);
}

function pitchUp() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.scale(delta, up, step/vec3.length(up)*vec3.length(dir));
    vec3.add(window.GL.center, center, delta);
    vec3.scale(delta, dir, -step/vec3.length(dir)*vec3.length(up));
    vec3.add(window.GL.up, up, delta);
}

function pitchDown() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.scale(delta, up, -step/vec3.length(up)*vec3.length(dir));
    vec3.add(window.GL.center, center, delta);
    vec3.scale(delta, dir, step/vec3.length(dir)*vec3.length(up));
    vec3.add(window.GL.up, up, delta);
}

function yawLeft() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, dir);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, step*vec3.length(dir));
    vec3.add(window.GL.center, center, delta);
}

function yawRight() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, center);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, -step*vec3.length(dir));
    vec3.add(window.GL.center, center, delta);
}

function rollClockwise() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, center);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, -step*vec3.length(up));
    vec3.add(up, up, delta);
    vec3.normalize(window.GL.up, up);
}

function rollCounterclockwise() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var step = window.GL.step;
    var up = window.GL.up;
    var dir = vec3.create();
    var delta = vec3.create();
    vec3.subtract(dir, center, eye);
    vec3.cross(delta, up, center);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, step*vec3.length(up));
    vec3.add(up, up, delta);
    vec3.normalize(window.GL.up, up);
}