.PHONY:
all:
	cmake -S . -B ./build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
	cmake --build build/
	cd ./build && ./fractals

.PHONY:
b:
	cmake -S . -B ./build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
	cmake --build build/

.PHONY:
r:
	cd ./build && ./fractals

.PHONY:
clean:
	cmake --build ./build --target clean
	rm -rf ./build
