import fabricImage from '../assets/fabric-image.png';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-3 bg-Batman-Black rounded-lg">
      <div className="flex items-center space-x-2">
        <img alt="Fabric Logo" src={fabricImage} height="23px" style={{ minWidth: '23px' }} />
      </div>
    </header>
  );
};

export default Header;
