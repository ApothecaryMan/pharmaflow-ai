import React, { createContext, useContext } from 'react';
import { employeeProfileRepository } from '../../../services/hr/repositories/employeeProfileRepository';
import { employmentRequestRepository } from '../../../services/hr/repositories/employmentRequestRepository';
import { authService } from '../../../services/auth/authService';

interface EmployeePortalServices {
  employeeProfileRepository: typeof employeeProfileRepository;
  employmentRequestRepository: typeof employmentRequestRepository;
  authService: typeof authService;
}

const defaultServices: EmployeePortalServices = {
  employeeProfileRepository,
  employmentRequestRepository,
  authService,
};

const EmployeePortalContext = createContext<EmployeePortalServices>(defaultServices);

export const EmployeePortalProvider: React.FC<{
  children: React.ReactNode;
  services?: Partial<EmployeePortalServices>;
}> = ({ children, services }) => {
  const contextValue = React.useMemo(() => ({ ...defaultServices, ...services }), [services]);

  return (
    <EmployeePortalContext.Provider value={contextValue}>
      {children}
    </EmployeePortalContext.Provider>
  );
};

export const useEmployeePortalServices = () => useContext(EmployeePortalContext);
