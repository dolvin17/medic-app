import ExpenseManager from "@/components/ExpenseMaganer";
import FixedCostsManager from "@/components/FixedCostsManager";

export default function Page() {
	return (
		<>
		<div className="p-4">
		<ExpenseManager/>
		<FixedCostsManager/>
		</div>
		</>
	);
}