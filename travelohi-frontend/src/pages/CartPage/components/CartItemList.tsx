import React from 'react';
import CartItemCard, { type CartItem } from './CartItemCard';
interface Props {
    items: CartItem[];
    onRemove: (id: string) => void;
    onEditDates: (item: CartItem) => void;
}
const CartItemList: React.FC<Props> = ({ items, onRemove, onEditDates }) => {
    return (
        <div>
            {items.map(item => (
                <CartItemCard
                    key={item.id}
                    item={item}
                    onRemove={onRemove}
                    onEditDates={onEditDates}
                />
            ))}
        </div>
    );
};
export default CartItemList;