/*
  * STEP 1
  * Access WebGL context
*/
const canvasDom = document.querySelector('canvas');
const imgDom = document.querySelector('img');
const gl = canvasDom.getContext('webgl');

const canvasWidth = canvasDom.clientWidth;
const canvasHeight = canvasDom.clientHeight;
// Set viewport when it comes to canvas resizing
// gl.viewport(0, 0, canvasWidth, canvasHeight)
gl.clearColor(1, 1, 1, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

/*
  * STEP 2
  * Create shaders and link program
*/
function createShader(gl, type, shaderSource) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if(!success) {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  return shader;
}

const vertexShaderSource = `
  precision mediump float;
  attribute vec2 position;
  uniform vec2 resolution;
  varying vec4 v_coord;

  void main() {
    vec2 glSpacePosition = (position / resolution) * 2.0 - 1.0;

    gl_Position = vec4(glSpacePosition * vec2(1, -1), 0, 1);
    v_coord = gl_Position * 0.5 + 0.5 * cos(0.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 resolution;
  varying vec4 v_coord;
  uniform float u_time;
  uniform sampler2D u_texture;

  void main() {
    vec2 pos = mod(vec2(v_coord.x, 1.0 - v_coord.y) * 1.0, 1.0);

    mat3 edgeDetectionKernel = mat3(
      -1, -1, -1,
      -1, 8, -1,
      -1, -1, -1
    );

    mat3 boxBlurKernel = mat3(
      1, 1, 1,
      1, mod(u_time, 10.0), 1,
      1, 1, 1
    ) / 9.0;
    vec2 onePixel = vec2(1, 1) / resolution;
    vec4 color = vec4(0);
    for(int i = 0; i < 3; i++) {
      for(int j = 0; j < 3; j++) {
        vec2 samplePos = pos + vec2(i - 1 , j - 1) * onePixel;
        vec4 sampleColor = texture2D(u_texture, samplePos);

        sampleColor *= boxBlurKernel[i][j];
        color += sampleColor;
      }
    }
    color.a = 1.0;

    float edge = 0.20 + 0.05 * sin(u_time);
    gl_FragColor = color;
  }
`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if(!success) {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  return program;
}

const program = createProgram(gl, vertexShader, fragmentShader);

/*
  * STEP 3
  * Configuration
*/
gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);
const positionAttributeLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionAttributeLocation);

const positionBuffer = gl.createBuffer();
// In WebGL, we can manipulate many resources on global bind points.
// Treat bind points as internal global variables hooks inside WebGL.
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// gl.vertexAttribPointer(location, size, type, normalize, stride, offset)
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const resolutionUniformLocation = gl.getUniformLocation(program, 'resolution');
gl.uniform2f(resolutionUniformLocation, canvasWidth, canvasHeight);
const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

/*
  * STEP 4
  * Bind data and call drawArrays
*/
const pointList = [
  0, 0,
  canvasWidth, 0,
  canvasWidth, canvasHeight,
  0, 0,
  canvasWidth, canvasHeight,
  0, canvasHeight
];

const texture = gl.createTexture();
texture.image = new Image();
texture.image.onload = function() {
  handleLoadedTexture(gl, texture, draw);
};
texture.image.crossOrigin = '';
// imgDom.src = texture.image.src = 'canva.png';
imgDom.src = texture.image.src = 'github.jpg';
imgDom.src = texture.image.src = 'demo.png';

function handleLoadedTexture(gl, texture, callback) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
  requestAnimationFrame(draw);
}

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointList), gl.STATIC_DRAW);
function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const timeStamp = performance.now() / 500.0;
  gl.uniform1f(timeUniformLocation, timeStamp);
  gl.drawArrays(gl.TRIANGLES, 0, pointList.length / 2);
  requestAnimationFrame(draw);
}
