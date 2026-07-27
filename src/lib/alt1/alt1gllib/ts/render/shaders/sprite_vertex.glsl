#version 300 es

in vec3 aPos;
in vec3 aCol;

uniform mat4 uTransform;

out vec3 vCol;

void main(void) {
	gl_Position = uTransform * vec4(aPos, 1.0);

	vCol = aCol;
}