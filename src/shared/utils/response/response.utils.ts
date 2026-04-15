import { CrudEnums, DbModels } from '@shared/types/model.types';
import { HttpStatus } from 'node_modules/@nestjs/common';

const EntityDeleted = (entityName: string, data?: any) => ({
  message: `${entityName} deleted sucessfully.`,
  code: HttpStatus.OK,
  data,
});

const FetchedSuccessFully = (entityName: string, data?: any) => ({
  message: `${entityName} fetched sucessfully.`,
  code: HttpStatus.OK,
  data,
});

const CreatedSuccessfully = (entityName: string, data?: any) => ({
  message: `${entityName} created sucessfully.`,
  code: HttpStatus.CREATED,
  data,
});

const UpdatedSuccessfully = (entityName: string, data?: any) => ({
  message: `${entityName} updated sucessfully.`,
  code: HttpStatus.OK,
  data,
});

export const CrudResponse = (
  modelName: DbModels,
  crud: CrudEnums,
  data?: any,
) => {
  switch (crud) {
    case CrudEnums.CREATE:
      return CreatedSuccessfully(modelName, data);
    case CrudEnums.READ:
      return FetchedSuccessFully(modelName, data);
    case CrudEnums.UPDATE:
      return UpdatedSuccessfully(modelName, data);
    case CrudEnums.DELETE:
      return EntityDeleted(modelName, data);
  }
};
