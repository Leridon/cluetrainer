#version 300 es

precision mediump float;

in vec3 vCol;

out vec4 fragColor;

void main(void) {
	fragColor = vec4(vCol,1);
}