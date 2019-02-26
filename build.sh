#!/bin/sh

mkdir -p bin
/usr/bin/clang -framework foundation -framework carbon -o bin/observer mac/observer.m
/usr/bin/clang -framework foundation -framework carbon -o bin/select mac/select.m
