/*==================== MOUSE EVENTS ==================*/
drag = false;
AMORTIZATION = 0.95;
dX = 0;
dY = 0;

function mouseDown(e) {
    drag = true;
    old_x = e.pageX;
    old_y = e.pageY;
    e.preventDefault();
    return false;
}

function mouseUp(e) {
    drag = false;
}

function mouseMove(e) {
    if (!drag) return false;
    dX = (e.pageX - old_x) * Math.PI / CANVAS.width;
    dY = (e.pageY - old_y) * Math.PI / CANVAS.height;
    THETA += dX;
    PHI += dY;
    old_x = e.pageX;
    old_y = e.pageY;
    e.preventDefault();
}

function initGL(canvas) {
    CANVAS = canvas;
    try {
        GL = canvas.getContext("experimental-webgl");
        GL.viewportWidth = canvas.width;
        GL.viewportHeight = canvas.height;
        var EXT = GL.getExtension("OES_element_index_uint") ||
            GL.getExtension("MOZ_OES_element_index_uint") ||
            GL.getExtension("WEBKIT_OES_element_index_uint");
    } catch (e) {
    }
    if (!GL) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

/*========================= SHADERS ========================= */

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
    var shader_vertex_shadowMap = getShader(GL, "shader-vertex-source-shadow");
    var shader_fragment_shadowMap = getShader(GL, "shader-fragment-source-shadow");

    SHADER_PROGRAM_SHADOW = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM_SHADOW, shader_vertex_shadowMap);
    GL.attachShader(SHADER_PROGRAM_SHADOW, shader_fragment_shadowMap);

    GL.linkProgram(SHADER_PROGRAM_SHADOW);
    _PmatrixShadow = GL.getUniformLocation(SHADER_PROGRAM_SHADOW, "Pmatrix");
    _LmatrixShadow = GL.getUniformLocation(SHADER_PROGRAM_SHADOW, "Lmatrix");
    _positionShadow = GL.getAttribLocation(SHADER_PROGRAM_SHADOW, "position");

    //BUILD DEFAULT RENDERING SHP
    var shader_vertex = getShader(GL, "shader-vertex-source");
    var shader_fragment = getShader(GL, "shader-fragment-source");

    SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    GL.linkProgram(SHADER_PROGRAM);

    _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    _Lmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Lmatrix");
    _PmatrixLight = GL.getUniformLocation(SHADER_PROGRAM, "PmatrixLight");
    _lightDirection = GL.getUniformLocation(SHADER_PROGRAM, "source_direction");
    _sampler = GL.getUniformLocation(SHADER_PROGRAM, "sampler");
    _samplerShadowMap = GL.getUniformLocation(SHADER_PROGRAM,
        "samplerShadowMap");

    _uv = GL.getAttribLocation(SHADER_PROGRAM, "uv");
    _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");

    GL.useProgram(SHADER_PROGRAM);
    GL.uniform1i(_sampler, 0);
    GL.uniform1i(_samplerShadowMap, 1);
    LIGHTDIR = [0.58, 0.58, -0.58];
    GL.uniform3fv(_lightDirection, LIGHTDIR);
}


/*========================= THE DRAGON ========================= */

function initDragon(callback) {
    CUBE_VERTEX = false;
    CUBE_FACES = false;
    CUBE_NPOINTS = 0;

    LIBS.get_json("resources/dragon.json", function (dragon) {
        //vertices
        CUBE_VERTEX = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        GL.bufferData(GL.ARRAY_BUFFER,
            new Float32Array(dragon.vertices),
            GL.STATIC_DRAW);

        //faces
        CUBE_FACES = GL.createBuffer();
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
            new Uint32Array(dragon.indices),
            GL.STATIC_DRAW);

        CUBE_NPOINTS = dragon.indices.length;
        callback();
    });

}
/*========================= THE FLOOR ========================= */

function initFloor() {
    var floor_vertices = [
        -10, 0, -10, 0, 1, 0, 0, 0, //1st point position,normal and UV
        -10, 0, 10, 0, 1, 0, 0, 1, //2nd point
        10, 0, 10, 0, 1, 0, 1, 1,
        10, 0, -10, 0, 1, 0, 1, 0
    ];

    FLOOR_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, FLOOR_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(floor_vertices), GL.STATIC_DRAW);

    FLOOR_INDICES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, FLOOR_INDICES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array([0, 1, 2, 0, 2, 3]), GL.STATIC_DRAW);
}


/*========================= MATRIX ========================= */

function initMatrix() {
    PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    MOVEMATRIX = LIBS.get_I4();
    VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -20);
    LIBS.translateY(VIEWMATRIX, -4);
    THETA = 0;
    PHI = 0;

    PROJMATRIX_SHADOW = LIBS.get_projection_ortho(100, 1, 5, 28);
    LIGHTMATRIX = LIBS.lookAtDir(LIGHTDIR, [0, 1, 0], [0, 0, 0]);
}


function get_texture (image_URL) {

    var image = new Image();

    image.src = image_URL;
    image.webglTexture = false;

    image.onload = function (e) {
        var texture = GL.createTexture();
        GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
        GL.bindTexture(GL.TEXTURE_2D, texture);
        GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
        GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
        GL.texParameteri(GL.TEXTURE_2D,
            GL.TEXTURE_MIN_FILTER, GL.NEAREST_MIPMAP_LINEAR);
        GL.generateMipmap(GL.TEXTURE_2D);
        GL.bindTexture(GL.TEXTURE_2D, null);
        image.webglTexture = texture;
    };

    return image;
}

function initTextures() {
    CUBE_TEXTURE = get_texture("resources/dragon.png");
    FLOOR_TEXTURE = get_texture("resources/granit.jpg");
}


    /*======================= RENDER TO TEXTURE ======================= */

function initBuffers() {

    fb = GL.createFramebuffer();
    GL.bindFramebuffer(GL.FRAMEBUFFER, fb);

    rb = GL.createRenderbuffer();
    GL.bindRenderbuffer(GL.RENDERBUFFER, rb);
    GL.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, 512, 512);

    GL.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT,
        GL.RENDERBUFFER, rb);

    texture_rtt = GL.createTexture();
    GL.bindTexture(GL.TEXTURE_2D, texture_rtt);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, 512, 512,
        0, GL.RGBA, GL.UNSIGNED_BYTE, null);

    GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0,
        GL.TEXTURE_2D, texture_rtt, 0);

    GL.bindTexture(GL.TEXTURE_2D, null);
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
}

/*========================= DRAWING ========================= */
function animate () {
    var now = new Date().getTime();
    var dt = now - TIME_OLD;
    if (!drag) {
        dX *= AMORTIZATION;
        dY *= AMORTIZATION;
        THETA += dX;
        PHI += dY;
    }
    LIBS.set_I4(MOVEMATRIX);
    LIBS.rotateY(MOVEMATRIX, THETA);
    LIBS.rotateX(MOVEMATRIX, PHI);
    TIME_OLD = now;
}


function drawScene() {
    //===================== RENDER THE SHADOW MAP ==========================
    GL.bindFramebuffer(GL.FRAMEBUFFER, fb);
    GL.useProgram(SHADER_PROGRAM_SHADOW);
    GL.enableVertexAttribArray(_positionShadow);

    GL.viewport(0.0, 0.0, 512, 512);
    GL.clearColor(1.0, 0.0, 0.0, 1.0); //red -> Z=Zfar on the shadow map
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    GL.uniformMatrix4fv(_PmatrixShadow, false, PROJMATRIX_SHADOW);
    GL.uniformMatrix4fv(_LmatrixShadow, false, LIGHTMATRIX);

    //DRAW THE DRAGON
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.vertexAttribPointer(_positionShadow, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 0);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.drawElements(GL.TRIANGLES, CUBE_NPOINTS, GL.UNSIGNED_INT, 0);

    //DRAW THE FLOOR
    GL.bindBuffer(GL.ARRAY_BUFFER, FLOOR_VERTEX);
    GL.vertexAttribPointer(_positionShadow, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 0);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, FLOOR_INDICES);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);

    GL.disableVertexAttribArray(_positionShadow);


    //==================== RENDER THE SCENE ===========================
    GL.bindFramebuffer(GL.FRAMEBUFFER, null);

    GL.useProgram(SHADER_PROGRAM);

    GL.enableVertexAttribArray(_uv);
    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_normal);

    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.clearColor(0.0, 0.0, 0.0, 1.0);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);
    GL.uniformMatrix4fv(_PmatrixLight, false, PROJMATRIX_SHADOW);
    GL.uniformMatrix4fv(_Lmatrix, false, LIGHTMATRIX);

    //DRAW THE DRAGON
    if (CUBE_TEXTURE.webglTexture) {
        GL.activeTexture(GL.TEXTURE1);
        GL.bindTexture(GL.TEXTURE_2D, texture_rtt);
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, CUBE_TEXTURE.webglTexture);
    }

    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 0);
    GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 3 * 4);
    GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false, 4 * (3 + 3 + 2), (3 + 3) * 4);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.drawElements(GL.TRIANGLES, CUBE_NPOINTS, GL.UNSIGNED_INT, 0);

    //DRAW THE FLOOR
    if (FLOOR_TEXTURE.webglTexture) {
        GL.bindTexture(GL.TEXTURE_2D, FLOOR_TEXTURE.webglTexture);
    }

    GL.bindBuffer(GL.ARRAY_BUFFER, FLOOR_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 0);
    GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 4 * (3 + 3 + 2), 3 * 4);
    GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false, 4 * (3 + 3 + 2), (3 + 3) * 4);

    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, FLOOR_INDICES);
    GL.drawElements(GL.TRIANGLES, 6, GL.UNSIGNED_SHORT, 0);

    GL.disableVertexAttribArray(_uv);
    GL.disableVertexAttribArray(_position);
    GL.disableVertexAttribArray(_normal);

    GL.flush();
}

function tick() {
    requestAnimFrame(tick);
    drawScene();
    animate();
}

function webGLStart(meshes) {
    console.log("in webgl start");
    var canvas = document.getElementById("your_canvas");
    initGL(canvas);

    canvas.addEventListener("mousedown", mouseDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mouseout", mouseUp, false);
    canvas.addEventListener("mousemove", mouseMove, false);

    GL.clearColor(0.0, 0.0, 0.0, 1.0);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearDepth(1.0);

    TIME_OLD = 0;

    initShaders();
    initMatrix();
    initBuffers();
    initTextures();
    initFloor();
    initDragon(tick);
}
