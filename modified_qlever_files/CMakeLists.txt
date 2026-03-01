


add_executable(qleverwasm dummy.cpp)

target_compile_options(qleverwasm PRIVATE -fexceptions)
set_target_properties(qleverwasm PROPERTIES
    OUTPUT_NAME "multithreadoutput11"
    SUFFIX ".js")

target_link_options(qleverwasm PRIVATE
    "-sMODULARIZE=1" "-sEXPORT_NAME=MyModule" "-sENVIRONMENT=web,worker" "-sEXPORT_ES6=0"
    "-sALLOW_MEMORY_GROWTH=0" "-sUSE_PTHREADS=1" "-sSAFE_HEAP=0" "-sDEFAULT_PTHREAD_STACK_SIZE=16777216"
    "-sPTHREAD_POOL_SIZE=6" "-sPROXY_TO_PTHREAD=1" "-sPTHREADS_DEBUG=1" "-sASSERTIONS=2"
    "-sDISABLE_EXCEPTION_CATCHING=0" "-sEXPORTED_RUNTIME_METHODS=['FS']" "-fexceptions"
    "--no-entry"
    )

target_link_libraries(qleverwasm PRIVATE embind "-Wl,--whole-archive" qlever "-Wl,--no-whole-archive")





add_library(qlever STATIC Qlever.cpp)
target_compile_options(qlever PRIVATE -fexceptions)
qlever_target_link_libraries(qlever parser engine util index absl::strings)
