import { HttpStatus } from '@nestjs/common';
import { CrudEnums, DbModels } from '../../types';

export interface ApiSuccessResponse<T = unknown> {
  message: string;
  code: HttpStatus;
  data: T;
}

const entityDeleted = <T>(
  entityName: string,
  data: T,
): ApiSuccessResponse<T> => ({
  message: `${entityName} deleted successfully.`,
  code: HttpStatus.OK,
  data,
});

const fetchedSuccessfully = <T>(
  entityName: string,
  data: T,
): ApiSuccessResponse<T> => ({
  message: `${entityName} fetched successfully.`,
  code: HttpStatus.OK,
  data,
});

const createdSuccessfully = <T>(
  entityName: string,
  data: T,
): ApiSuccessResponse<T> => ({
  message: `${entityName} created successfully.`,
  code: HttpStatus.CREATED,
  data,
});

const updatedSuccessfully = <T>(
  entityName: string,
  data: T,
): ApiSuccessResponse<T> => ({
  message: `${entityName} updated successfully.`,
  code: HttpStatus.OK,
  data,
});

export const CrudResponse = <T>(
  modelName: DbModels,
  crud: CrudEnums,
  data: T,
): ApiSuccessResponse<T> => {
  switch (crud) {
    case CrudEnums.CREATE:
      return createdSuccessfully(modelName, data);
    case CrudEnums.READ:
      return fetchedSuccessfully(modelName, data);
    case CrudEnums.UPDATE:
      return updatedSuccessfully(modelName, data);
    case CrudEnums.DELETE:
      return entityDeleted(modelName, data);
    default: {
      const exhaustiveCheck: never = crud;

      void exhaustiveCheck;
      throw new Error('Unsupported CRUD action.');
    }
  }
};
