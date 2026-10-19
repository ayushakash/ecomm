import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantAPI } from "../../services/api";
import MerchantProductsPage from "../merchant/Products";

// Admin view of one merchant's products: same screen the merchant sees, scoped by merchantId.
const MerchantProducts = () => {
  const { merchantId } = useParams();
  const { data: merchant } = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantAPI.getMerchant(merchantId).then((res) => res.data.merchant),
  });

  return (
    <div>
      <div className="max-w-7xl mx-auto px-8 pt-6">
        <Link to="/admin/merchants" className="text-sm text-blue-600 hover:underline">← Back to merchants</Link>
      </div>
      <MerchantProductsPage merchantId={merchantId} merchantName={merchant?.businessName || merchant?.name || "Merchant"} />
    </div>
  );
};

export default MerchantProducts;
