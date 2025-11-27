// Create a function which takes args as dataSourceType and ormType and option i.e key and value and transforms it to a valid column option for typeorm
// If the database is Mssql and the field ormType is varchar or nvarchar, and the max = -1, set length to 'MAX'
// Add a proper switch case for a database and handle accordingly
export enum SupportedDatabases {
  Postgres = 'postgres',
  Mssql = 'mssql',
}
export function transformColumnOptionForDatabase(
  optionKey: string,
  optionValue: any,
  ormType: string,
  dataSourceType?: SupportedDatabases,
): any {
  if (dataSourceType === SupportedDatabases.Mssql) {
    if (optionKey === 'length' && optionValue === -1 && (ormType === 'varchar' || ormType === 'nvarchar')) {
      return 'MAX';
    }
  }
  // Add more database specific transformations here as needed

  return optionValue;
}