import { FC } from 'hono/jsx';
import Layout from './components/Layout';

const Home: FC = (props) => {
  return (
    <Layout>
      <h1>Todo Manager</h1>
      <p>This is a simple todo manager.</p>
    </Layout>
  );
};

export const homeRender = (c: any): any => {
  return c.render(<Home />);
};
