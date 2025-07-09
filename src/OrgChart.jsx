import Tree from 'react-d3-tree';

export default function OrgChart({ data }) {
  const containerStyles = {
    width: '100%',
    height: '600px',
    border: '1px solid #ccc',
    marginTop: '2rem',
  };

  return (
    <div style={containerStyles}>
      <Tree data={data} orientation="vertical" />
    </div>
  );
}
