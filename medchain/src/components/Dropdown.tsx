
import React from 'react'
import Select from 'react-select'

interface Option{
  value: string;
  label: string;
}
interface DropdownProps{
  closeMenuOnSelect: boolean;
  options : Option[];

}
const Dropdown:React.FC<DropdownProps> = ({options, closeMenuOnSelect}) => {
  return (
    <div>
      <Select
        closeMenuOnSelect={closeMenuOnSelect}
        options={options}
      />
    </div>
  )
}

export default Dropdown;
