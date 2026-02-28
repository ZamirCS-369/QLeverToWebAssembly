import type MyModuleFactory from "./nomultithreadoutput11.js";

declare module "./multithreadoutput11.js" {
  const factory: any;
  //export default factory;
}