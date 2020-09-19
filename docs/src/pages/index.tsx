import getFuncs from "../lib/get-funcs";

const Home = ({ funcs }) => {
  return (
    <div>
      <h1>Coming soon ...</h1>
      {funcs.map((func) => (
        <a href={`/func/${func.slug}`}>{func.title}</a>
      ))}
    </div>
  );
};

export const getStaticProps = () => {
  const funcs = getFuncs();

  return {
    props: {
      funcs,
    },
  };
};

export default Home;
