import ClaimDetail from '../../pages/claim-detail';
import { Route } from 'wouter';

export default function ClaimDetailExample() {
  return (
    <Route path="/claims/:id">
      <ClaimDetail />
    </Route>
  );
}
