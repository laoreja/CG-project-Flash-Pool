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
window.GL.radius = 0.6;
window.GL.ballVertexPositionBuffer = null;
window.GL.ballVertexNormalBuffer = null;
window.GL.ballVertexTextureCoordBuffer = null;
window.GL.ballVertexIndexBuffer = null;
window.GL.balls = [];
window.GL.keyPressed = {};
window.GL.eye = vec3.fromValues(0, 5, 12.7);
window.GL.center = vec3.fromValues(0, 0, 0);
window.GL.up = vec3.fromValues(0, 12.7, -5);
window.GL.step = 0.1;

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
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

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

    /*
    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
    */
}

function drawScene() {
    var balls = window.GL.balls;

    for (var i = 0; i < balls.length; i++) {
        balls[i].render();
    }
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
    update();
    handleKey();
    drawScene();
    animate();
}

function update() {
    var renderBalls = window.GL.balls;
    var physicalBalls = window.PHYSICS.ballBodies;

    window.PHYSICS.world.step(1/60);
    for (var i = 0; i < renderBalls.length && i < physicalBalls.length; i++) {
        renderBalls[i].setPos(physicalBalls[i].position.toArray());
        //console.log(physicalBalls[i].position);
        //console.log(renderBalls[i].pos);
        //renderBalls[i].setQuat(physicalBalls[i].quaternion.toArray());
    }
}

function webGLStart() {
    var canvas = document.getElementById("webgl-canvas");
    var gl;
    initGL(canvas);
    initShaders();
    initBallBuffers();
    initTableBuffers();
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
    mat4.fromQuat(mvMatrix, this.quat);
    mat4.translate(window.GL.mvMatrix, mvMatrix, [this.pos[0], this.pos[1], this.pos[2]]);

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
    //TODO
}

function initBalls() {
    var balls = window.GL.balls;
    var inits = [
        [0, 0.6, 8.2, "tex/ball0.png"],
        [0.000000, 0.6, -6.950000, "tex/ball1.png"],
        [0.600000, 0.6, -7.989230, "tex/ball2.png"],
        [-0.600000, 0.6, -7.989230, "tex/ball3.png"],
        [1.200000, 0.6, -9.028461, "tex/ball4.png"],
        [0.000000, 0.6, -9.028461, "tex/ball5.png"],
        [-1.200000, 0.6, -9.028461, "tex/ball6.png"],
        [1.800000, 0.6, -10.067691, "tex/ball7.png"],
        [0.600000, 0.6, -10.067691, "tex/ball8.png"],
        [-0.600000, 0.6, -10.067691, "tex/ball9.png"],
        [-1.800000, 0.6, -10.067691, "tex/ball10.png"],
        [2.400000, 0.6, -11.106922, "tex/ball11.png"],
        [1.200000, 0.6, -11.106922, "tex/ball12.png"],
        [0.000000, 0.6, -11.106922, "tex/ball13.png"],
        [-1.200000, 0.6, -11.106922, "tex/ball14.png"],
        [-2.400000, 0.6, -11.106922, "tex/ball15.png"]
    ];

    for (var i = 0; i < inits.length; i++) {
        balls.push(new Ball([inits[i][0], inits[i][1], inits[i][2]], inits[i][3]));
    }
}

function handleKeyUp(event) {
    window.GL.keyPressed[event.keyCode] = false;
}

function handleKeyDown(event) {
    window.GL.keyPressed[event.keyCode] = true;
}

function handleKey() {
    var eye = window.GL.eye;
    var center = window.GL.center;
    var keyPressed = window.GL.keyPressed;
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