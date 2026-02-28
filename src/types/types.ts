declare namespace qlever {
  export function init(): Promise<{
    Qlever: new () => {
      // Add your methods and properties here
      (): void;
      // ... other methods/properties
    };
  }>;
}
