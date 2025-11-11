
import React from 'react';
import { Card, Button } from './Shared';
import type { PlanName } from '../types';
import { PLANS } from '../constants';
import { CheckCircleIcon } from './Icons';

interface PlansPageProps {
  userPlan: PlanName;
}

export const PlansPage: React.FC<PlansPageProps> = ({ userPlan }) => {
  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Nossos Planos</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Escolha o plano que melhor se adapta às suas necessidades.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {Object.entries(PLANS).map(([planKey, plan]) => {
          const isCurrentPlan = planKey === userPlan;
          return (
            <Card key={planKey} className={`flex flex-col ${isCurrentPlan ? 'border-2 border-primary-500' : ''}`}>
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 -mt-3 mr-3 px-3 py-1 bg-primary-500 text-white text-sm font-semibold rounded-full">Seu Plano</div>
              )}
              <div className="flex-grow">
                <h3 className={`text-2xl font-semibold ${plan.color}`}>{plan.name}</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl font-bold text-gray-800 dark:text-white">{plan.price}</span>
                  /mês
                </p>
                <ul className="mt-6 space-y-3 text-gray-600 dark:text-gray-300">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center">
                      <CheckCircleIcon />
                      <span className="ml-3">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                {isCurrentPlan ? (
                  <Button variant="secondary" disabled className="w-full">Plano Atual</Button>
                ) : (
                  <a 
                    href="https://wa.me/5500000000000?text=Ol%C3%A1!%20Gostaria%20de%20fazer%20o%20upgrade%20para%20o%20plano%20Profissional." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full block"
                  >
                    <Button className="w-full">Fazer Upgrade</Button>
                  </a>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
