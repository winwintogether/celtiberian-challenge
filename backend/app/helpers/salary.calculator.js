const { convertDecimalNumber, buildErrObject } = require('./utils')
const { payrollTax, payrollTaxBT } = require('../../config/constants')
const { pensionType } = require('../../config/types')

const serializeSalaryCalculatorData = input => {
  /* eslint-disable */
  const {
    // from templates
    reserve_housing_costs_boo,
    addition_et_costs,
    interim_salary_adjustment,
    reserved_mandatory_holidays_in_days,
    payout_extra_holidays,
    reserved_public_holidays,
    reserved_others,
    reserved_adv,
    reserved_holiday_allowance,
    supplementry_healthinsurance,
    pension_premium_basic,
    pension_basis,
    pension_premium_plus,
    illness_insurance,
    paid_while_on_bench,
    transition_compensation,
    encash_extra_holidays,
    awf_sv_premium,
    wga_sv_premium,
    zw_sv_premium,
    wia_sv_premium,
    zvw_sv_premium,
    sfu_sv_premium,
    creche_reserve,
    total_sv_premium,
    sustainability_premium,
    retained_health_insurance,
    hiway_costs,
    cost_of_living_allowance,

    // from users
    hours_per_week,
    hourly_rate,
    employment_rate,
    housing_allowance,
    business_travel_compensation,
    other_allowances,
    et_costs,
    other_travel_compensation,
    extra_hours_rate1,
    extra_hours_rate2,
    extra_hours_discount_rate1,
    extra_hours_discount_rate2,
    extra_hours_rate1_percentage,
    extra_hours_rate2_percentage,
    extra_hours_discount_rate1_percentage,
    extra_hours_discount_rate2_percentage,
    stipp_pension_boo,
    stipp_pension_type,
    adjust_salary_discount_boo,
    pay_reserves_weekly_boo,
    brokerage_fee,
  } = input

  const result = {
    addition_et_costs_costprice: 0,
    addition_et_costs_netsalary: 0,
    basic_salary_costprice: 0,
    basic_salary_netsalary: 0,
    salary_in_eur_costprice: 0,
    salary_in_eur_netsalary: 0,
    basic_salary_deduction_et_costprice: 0,
    basic_salary_deduction_et_netsalary: 0,
    interim_salary_costprice: 0,
    interim_salary_netsalary: 0,
    interim_salary_adjustment_over: 2,
    interim_salary_adjustment_costprice: 0,
    interim_salary_adjustment_netsalary: 0,
    final_salary_costprice: 0,
    final_salary_netsalary: 0,
    salary_per_cao_per_hour: 0,
    reserved_mandatory_holidays_in_days_over: 4,
    reserved_mandatory_holidays_in_days_costprice: 0,
    reserved_mandatory_holidays_in_days_netsalary: 0,
    payout_extra_holidays_over: 4,
    payout_extra_holidays_costprice: 0,
    payout_extra_holidays_netsalary: 0,
    reserved_public_holidays_over: 4,
    reserved_public_holidays_costprice: 0,
    reserved_public_holidays_netsalary: 0,
    reserved_others_over: 4,
    reserved_others_costprice: 0,
    reserved_others_netsalary: 0,
    reserved_adv_over: 1,
    reserved_adv_costprice: 0,
    reserved_adv_netsalary: 0,
    reserved_holiday_allowance_over: 2567,
    reserved_holiday_allowance_costprice: 0,
    reserved_holiday_allowance_netsalary: 0,
    total_paidout_reserves_netsalary: 0,
    total_gross_periodic_salary_netsalary: 0,
    supplementry_healthinsurance_over: 9,
    supplementry_healthinsurance_costprice: 0,
    supplementry_healthinsurance_netsalary: 0,
    pension_premium_basic_over: 138,
    pension_premium_basic_costprice: 0,
    pension_premium_basic_netsalary: 0,
    pension_basis_costprice: 0,
    pension_basis_netsalary: 0,
    pension_premium_plus_over: 138,
    pension_premium_plus_costprice: 0,
    pension_premium_plus_netsalary: 0,
    illness_insurance_over: 9,
    illness_insurance_costprice: 0,
    illness_insurance_netsalary: 0,
    paid_while_on_bench_over: 9,
    paid_while_on_bench_costprice: 0,
    paid_while_on_bench_netsalary: 0,
    transition_compensation_over: 9,
    transition_compensation_costprice: 0,
    transition_compensation_netsalary: 0,
    overtime_rate1: 0,
    overtime_rate1_costprice: 0,
    overtime_rate1_netsalary: 0,
    rate_1_adjustment: 0,
    rate_1_adjustment_costprice: 0,
    rate_1_adjustment_netsalary: 0,
    rate_2_adjustment: 0,
    rate_2_adjustment_costprice: 0,
    rate_2_adjustment_netsalary: 0,
    encash_extra_holidays_netsalary: 0,
    encash_extra_holidays_costprice: 0,
    encash_compensation_hours_costprice: 0,
    encash_compensation_hours_netsalary: 0,
    encash_other_overtime: 0,
    fundamental_sv_premium_netsalary: 0,
    awf_sv_premium_over: 10,
    awf_sv_premium_costprice: 0,
    awf_sv_premium_netsalary: 0,
    wga_sv_premium_over: 10,
    wga_sv_premium_costprice: 0,
    wga_sv_premium_netsalary: 0,
    zw_sv_premium_over: 10,
    zw_sv_premium_costprice: 0,
    zw_sv_premium_netsalary: 0,
    wia_sv_premium_over: 10,
    wia_sv_premium_costprice: 0,
    wia_sv_premium_netsalary: 0,
    creche_reserve_over: 10,
    creche_reserve_costprice: 0,
    creche_reserve_netsalary: 0,
    zvw_sv_premium_over: 10,
    zvw_sv_premium_costprice: 0,
    zvw_sv_premium_netsalary: 0,
    sustainability_premium_over: 10,
    sustainability_premium_costprice: 0,
    sustainability_premium_netsalary: 0,
    sfu_sv_premium_over: 10,
    sfu_sv_premium_costprice: 0,
    sfu_sv_premium_netsalary: 0,
    total_sv_premium_costprice: 0,
    taxable_gross_salary_netsalary: 0,
    income_tax_over: 11,
    income_tax_netsalary: 0,
    income_tax_bt: 0,
    income_tax_bt_netsalary: 0,
    net_salary_prepayout_netsalary: 0,
    hiway_costs_costprice: 0,
    business_travel_compensation_netsalary: 0,
    business_travel_compensation_costprice: 0,
    employee_contribution_wga_preimum: 0,
    employee_contribution_wga_preimum_over: 10,
    employee_contribution_wga_preimum_netsalary: 0,
    employee_contribution_wga_preimum_costprice: 0,
    other_allowances_netsalary: 0,
    other_allowances_costprice: 0,
    cost_of_living_allowance_netsalary: 0,
    cost_of_living_allowance_costprice: 0,
    other_travel_compensation_netsalary: 0,
    other_travel_compensation_costprice: 0,
    housing_allowance_netsalary: 0,
    housing_allowance_costprice: 0,
    retained_housing_allowance_netsalary: 0,
    retained_housing_allowance_costprice: 0,
    retained_health_insurance_netsalary: 0,
    retained_health_insurance_costprice: 0,
    net_salary_payout_netsalary: 0,
    costs_health_insurance_costprice: 0,
    costs_housing_costprice: 0,
    total_employee_costs_costprice: 0,
    employee_cost_per_hour_costprice: 0,
    employee_cost_factor_costprice: 0,
    employment_rate_costprice: 0,
    brokerage_fee_costprice: 0,
    required_ET_costs_costprice: 0,
    responsibility_ET_costs: 0,
    overtime_rate_netsalary: 0,
    et_overige: 0,
    sum_income_tax_netsalary: 0,
    employment_costs: 0,
    profit: 0,
    profit_percentage: 0
  }

  const hours = hours_per_week + extra_hours_discount_rate1 + extra_hours_discount_rate2
  const totalHours = hours_per_week + extra_hours_rate1 + extra_hours_rate2 + extra_hours_discount_rate1 + extra_hours_discount_rate2

  // salary variables
  result.salary_in_eur_costprice = hourly_rate * hours
  result.salary_in_eur_netsalary = result.salary_in_eur_costprice

  result.addition_et_costs_costprice = (et_costs * hours * addition_et_costs) / 100
  result.addition_et_costs_netsalary = result.addition_et_costs_costprice

  result.basic_salary_costprice = result.salary_in_eur_costprice + result.addition_et_costs_costprice
  result.basic_salary_netsalary = result.salary_in_eur_netsalary + result.addition_et_costs_netsalary

  result.basic_salary_deduction_et_costprice = -result.addition_et_costs_costprice
  result.basic_salary_deduction_et_netsalary = result.basic_salary_deduction_et_costprice

  result.interim_salary_costprice = result.basic_salary_costprice + result.basic_salary_deduction_et_costprice
  result.interim_salary_netsalary = result.basic_salary_netsalary + result.basic_salary_deduction_et_netsalary

  result.interim_salary_adjustment_costprice = (result.interim_salary_costprice * interim_salary_adjustment) / 100
  result.interim_salary_adjustment_netsalary = result.interim_salary_adjustment_costprice

  result.final_salary_costprice = result.interim_salary_costprice + result.interim_salary_adjustment_costprice
  result.final_salary_netsalary = result.interim_salary_netsalary + result.interim_salary_adjustment_netsalary

  // rate variables
  if (hours > 0) {
    result.salary_per_cao_per_hour = result.basic_salary_costprice / hours
  }

  if ((et_costs * addition_et_costs) / result.salary_per_cao_per_hour > 30) {
    throw buildErrObject(422, 'Max. 30% uit te ruilen')
  }
  // reverse variables
  result.reserved_mandatory_holidays_in_days_costprice = (result.final_salary_costprice * reserved_mandatory_holidays_in_days) / 100

  result.payout_extra_holidays_costprice = (result.final_salary_costprice * payout_extra_holidays) / 100
  result.payout_extra_holidays_netsalary = pay_reserves_weekly_boo ? result.payout_extra_holidays_costprice : 0

  result.reserved_public_holidays_costprice = (result.final_salary_costprice * reserved_public_holidays) / 100
  result.reserved_others_costprice =  (result.final_salary_costprice * reserved_others) / 100

  result.reserved_adv_costprice = (result.interim_salary_costprice * reserved_adv) / 100
  result.reserved_adv_netsalary = result.reserved_adv_costprice

  result.reserved_holiday_allowance_costprice =
    (
      reserved_holiday_allowance *
      (
        result.interim_salary_costprice +
        result.reserved_mandatory_holidays_in_days_costprice +
        result.payout_extra_holidays_costprice
      )
    ) / 100

  result.reserved_holiday_allowance_netsalary = pay_reserves_weekly_boo ? result.reserved_holiday_allowance_costprice : 0

  result.total_paidout_reserves_netsalary = result.payout_extra_holidays_netsalary + result.reserved_adv_netsalary + result.reserved_holiday_allowance_netsalary
  result.total_gross_periodic_salary_netsalary = result.final_salary_netsalary + result.total_paidout_reserves_netsalary

  result.supplementry_healthinsurance_costprice = (result.total_gross_periodic_salary_netsalary * (supplementry_healthinsurance - 1.33)) / 100
  result.supplementry_healthinsurance_netsalary = -((result.total_gross_periodic_salary_netsalary * (supplementry_healthinsurance - 2.07)) / 100)

  result.pension_premium_basic_costprice = stipp_pension_boo && stipp_pension_type === pensionType.BASIC
    ? (
    pension_premium_basic * (
      result.total_paidout_reserves_netsalary +
      result.interim_salary_adjustment_netsalary +
      result.basic_salary_netsalary
    )
  ) / 100
    : 0

  const total_costprice =
    result.reserved_mandatory_holidays_in_days_costprice -
    result.reserved_mandatory_holidays_in_days_netsalary +
    (result.reserved_public_holidays_costprice - result.reserved_public_holidays_netsalary) +
    (result.reserved_others_costprice - result.reserved_others_netsalary) +
    (result.reserved_holiday_allowance_costprice - result.reserved_holiday_allowance_netsalary) +
    (result.payout_extra_holidays_costprice - result.payout_extra_holidays_netsalary) +
    (result.reserved_adv_costprice - result.reserved_adv_netsalary)

  result.pension_basis_costprice = (pension_basis * total_costprice) / 100

  if (result.salary_per_cao_per_hour > 0) {
    result.pension_premium_plus_costprice = stipp_pension_boo && stipp_pension_type === pensionType.PLUS
      ?
      (
        (pension_premium_plus / 100 * (
            result.basic_salary_netsalary +
            result.total_paidout_reserves_netsalary +
            result.interim_salary_adjustment_netsalary -
            (
              hours_per_week +
              (
                result.reserved_mandatory_holidays_in_days_netsalary +
                result.payout_extra_holidays_netsalary +
                result.reserved_public_holidays_netsalary
              ) / result.salary_per_cao_per_hour
            ) * 7.01
          )
        ) / 3
      ) * 2
      : 0
  } else {
    result.pension_premium_plus_costprice = stipp_pension_boo && stipp_pension_type === pensionType.PLUS
      ?
      (
        (pension_premium_plus / 100 *
          (
            result.basic_salary_netsalary +
            result.total_paidout_reserves_netsalary +
            result.interim_salary_adjustment_netsalary -
            hours_per_week * 7.01
          )
        ) / 3
      ) * 2
      : 0
  }

  result.pension_premium_plus_netsalary = stipp_pension_boo && stipp_pension_type === pensionType.PLUS
    ? -(result.pension_premium_plus_costprice / 2)
    : 0

  result.illness_insurance_costprice = (result.total_gross_periodic_salary_netsalary * illness_insurance) / 100
  result.paid_while_on_bench_costprice = (result.total_gross_periodic_salary_netsalary * paid_while_on_bench) / 100
  result.transition_compensation_costprice = ((result.final_salary_netsalary + result.reserved_holiday_allowance_costprice) * transition_compensation) / 100

  result.overtime_rate1 = extra_hours_rate1_percentage
  result.overtime_rate1_costprice = (result.overtime_rate1 * extra_hours_rate1 * result.salary_per_cao_per_hour) / 100
  result.overtime_rate1_netsalary = result.overtime_rate1_costprice

  result.overtime_rate2 = extra_hours_rate2_percentage
  result.overtime_rate2_costprice = (result.overtime_rate2 * extra_hours_rate2 * result.salary_per_cao_per_hour) / 100
  result.overtime_rate2_netsalary = result.overtime_rate2_costprice

  result.rate_1_adjustment = extra_hours_discount_rate1_percentage
  result.rate_1_adjustment_costprice = (result.rate_1_adjustment * extra_hours_discount_rate1 * result.salary_per_cao_per_hour) / 100
  result.rate_1_adjustment_netsalary = result.rate_1_adjustment_costprice

  result.rate_2_adjustment = extra_hours_discount_rate2_percentage
  result.rate_2_adjustment_costprice = (result.rate_2_adjustment * extra_hours_discount_rate2 * result.salary_per_cao_per_hour) / 100
  result.rate_2_adjustment_netsalary = result.rate_2_adjustment_costprice

  result.encash_extra_holidays_netsalary = (encash_extra_holidays * result.payout_extra_holidays_costprice) / 100
  result.encash_extra_holidays_costprice = result.encash_extra_holidays_netsalary

  result.encash_other_overtime = result.basic_salary_costprice * 0.3 - result.addition_et_costs_costprice

  result.fundamental_sv_premium_netsalary =
    result.total_gross_periodic_salary_netsalary +
    result.supplementry_healthinsurance_netsalary +
    result.pension_premium_plus_netsalary +
    result.pension_basis_netsalary +
    result.pension_premium_basic_netsalary +
    result.illness_insurance_netsalary +
    result.paid_while_on_bench_netsalary +
    result.transition_compensation_netsalary +
    result.overtime_rate1_netsalary +
    result.overtime_rate2_netsalary +
    result.rate_1_adjustment_netsalary +
    result.rate_2_adjustment_netsalary +
    result.encash_extra_holidays_netsalary +
    result.encash_compensation_hours_netsalary

  // SV-premies variables
  result.awf_sv_premium_costprice = result.fundamental_sv_premium_netsalary * awf_sv_premium / 100
  result.wga_sv_premium_costprice = result.fundamental_sv_premium_netsalary * wga_sv_premium / 100
  result.zw_sv_premium_costprice = result.fundamental_sv_premium_netsalary * zw_sv_premium / 100
  result.wia_sv_premium_costprice = result.fundamental_sv_premium_netsalary * wia_sv_premium / 100
  result.creche_reserve_costprice = result.fundamental_sv_premium_netsalary * creche_reserve / 100
  result.zvw_sv_premium_costprice = result.fundamental_sv_premium_netsalary * zvw_sv_premium / 100
  result.sustainability_premium_costprice = result.fundamental_sv_premium_netsalary * sustainability_premium / 100
  result.sfu_sv_premium_costprice = result.fundamental_sv_premium_netsalary * sfu_sv_premium / 100

  result.total_sv_premium_costprice = total_sv_premium * total_costprice / 100

  result.taxable_gross_salary_netsalary =
    result.fundamental_sv_premium_netsalary +
    result.awf_sv_premium_netsalary +
    result.wga_sv_premium_netsalary +
    result.zw_sv_premium_netsalary +
    result.wia_sv_premium_netsalary +
    result.creche_reserve_netsalary +
    result.zvw_sv_premium_netsalary +
    result.sustainability_premium_netsalary +
    result.sfu_sv_premium_netsalary

  const compareValue1 = result.taxable_gross_salary_netsalary
  for (let i = 0; i < payrollTax.length - 1; i++) {
    if (payrollTax[i][0] <= compareValue1 && payrollTax[i + 1][0] > compareValue1) {
      result.income_tax_netsalary = adjust_salary_discount_boo
        ? -payrollTax[i][2]
        : -payrollTax[i][1]
      break
    }
  }

  const compareValue2 = hourly_rate * hours_per_week * 52
  for (let i = 0; i < payrollTaxBT.length - 1; i++) {
    if (payrollTaxBT[i][0] <= compareValue2 && payrollTaxBT[i + 1][0] > compareValue2) {
      result.income_tax_bt = adjust_salary_discount_boo
        ? payrollTaxBT[i][4]
        : payrollTaxBT[i][1]
      break
    }
  }

  result.income_tax_bt_netsalary = -(
    (result.income_tax_bt *
      (
        result.overtime_rate1_netsalary +
        result.overtime_rate2_netsalary +
        result.rate_1_adjustment_netsalary +
        result.rate_2_adjustment_netsalary +
        result.encash_compensation_hours_netsalary
      )
    ) / 100
  )

  result.net_salary_prepayout_netsalary = result.taxable_gross_salary_netsalary + result.income_tax_netsalary + result.income_tax_bt_netsalary

  result.hiway_costs_costprice = (result.final_salary_netsalary * hiway_costs) / 100

  // Netto inhoudingen/vergoedingen variables
  result.business_travel_compensation_netsalary = business_travel_compensation
  result.business_travel_compensation_costprice = result.business_travel_compensation_netsalary

  result.employee_contribution_wga_preimum = 0.5 * wga_sv_premium
  result.employee_contribution_wga_preimum_netsalary = -result.fundamental_sv_premium_netsalary * result.employee_contribution_wga_preimum / 100
  result.employee_contribution_wga_preimum_costprice = result.employee_contribution_wga_preimum_netsalary

  result.other_allowances_netsalary = other_allowances
  result.other_allowances_costprice = result.other_allowances_netsalary

  result.cost_of_living_allowance_netsalary = cost_of_living_allowance
  result.cost_of_living_allowance_costprice = result.cost_of_living_allowance_netsalary

  result.other_travel_compensation_netsalary = other_travel_compensation
  result.other_travel_compensation_costprice = result.other_travel_compensation_netsalary

  result.housing_allowance_netsalary = housing_allowance
  result.housing_allowance_costprice = result.housing_allowance_netsalary

  result.retained_housing_allowance_netsalary = reserve_housing_costs_boo ? -result.housing_allowance_netsalary : 0
  result.retained_housing_allowance_costprice = result.retained_housing_allowance_netsalary

  result.retained_health_insurance_netsalary = retained_health_insurance
  result.retained_health_insurance_costprice = result.retained_health_insurance_netsalary

  result.net_salary_payout_netsalary =
    result.net_salary_prepayout_netsalary +
    result.business_travel_compensation_netsalary +
    result.employee_contribution_wga_preimum_netsalary +
    result.other_allowances_netsalary +
    result.cost_of_living_allowance_netsalary +
    result.other_travel_compensation_netsalary +
    result.housing_allowance_netsalary +
    result.retained_housing_allowance_netsalary +
    result.retained_health_insurance_netsalary

  result.costs_health_insurance_costprice = result.retained_health_insurance_netsalary
  result.costs_housing_costprice = result.housing_allowance_netsalary
  result.total_employee_costs_costprice =
    result.final_salary_costprice +
    result.reserved_mandatory_holidays_in_days_costprice +
    result.payout_extra_holidays_costprice +
    result.reserved_public_holidays_costprice +
    result.reserved_others_costprice +
    result.reserved_adv_costprice +
    result.reserved_holiday_allowance_costprice +
    result.supplementry_healthinsurance_costprice +
    result.pension_premium_basic_costprice +
    result.pension_basis_costprice +
    result.pension_premium_plus_costprice +
    result.illness_insurance_costprice +
    result.paid_while_on_bench_costprice +
    result.transition_compensation_costprice +
    result.overtime_rate1_costprice +
    result.overtime_rate2_costprice +
    result.rate_1_adjustment_costprice +
    result.rate_2_adjustment_costprice +
    result.encash_extra_holidays_costprice +
    result.encash_compensation_hours_costprice +
    result.awf_sv_premium_costprice +
    result.wga_sv_premium_costprice +
    result.zw_sv_premium_costprice +
    result.wia_sv_premium_costprice +
    result.creche_reserve_costprice +
    result.zvw_sv_premium_costprice +
    result.sustainability_premium_costprice +
    result.sfu_sv_premium_costprice +
    result.total_sv_premium_costprice +
    result.hiway_costs_costprice +
    result.business_travel_compensation_costprice +
    result.employee_contribution_wga_preimum_costprice +
    result.other_allowances_costprice +
    result.cost_of_living_allowance_costprice +
    result.other_travel_compensation_costprice +
    result.housing_allowance_costprice +
    result.retained_housing_allowance_costprice +
    result.retained_health_insurance_costprice +
    result.costs_health_insurance_costprice +
    result.costs_housing_costprice

  if ((hours + extra_hours_rate1 + extra_hours_rate2) > 0) {
    result.employee_cost_per_hour_costprice = result.total_employee_costs_costprice / (hours + extra_hours_rate1 + extra_hours_rate2)
  }
  if (result.basic_salary_costprice > 0) {
    result.employee_cost_factor_costprice = result.total_employee_costs_costprice / result.basic_salary_costprice
  }

  result.employment_rate_costprice = employment_rate
  result.brokerage_fee_costprice = result.employment_rate_costprice - result.employee_cost_per_hour_costprice
  if (encash_extra_holidays > 0) {
    result.required_ET_costs_costprice = -(
      (
        (
          result.basic_salary_deduction_et_costprice +
          result.encash_extra_holidays_netsalary
        ) / encash_extra_holidays
      ) * 100
    ) - result.encash_compensation_hours_netsalary
  } else {
    result.required_ET_costs_costprice = -result.encash_compensation_hours_netsalary
  }


  result.responsibility_ET_costs = result.cost_of_living_allowance_netsalary + result.other_travel_compensation_netsalary + result.housing_allowance_netsalary

  result.overtime_rate_netsalary = result.overtime_rate1_netsalary + result.overtime_rate2_netsalary
  result.et_overige = result.business_travel_compensation_netsalary + result.other_allowances_netsalary + result.other_travel_compensation_netsalary
  result.sum_income_tax_netsalary = result.income_tax_netsalary + result.income_tax_bt_netsalary

  result.employment_costs = result.total_employee_costs_costprice + brokerage_fee * totalHours
  result.profit =  employment_rate * totalHours - result.employment_costs

  if (employment_rate * totalHours > 0) {
    result.profit_percentage = result.profit * 100 / (employment_rate * totalHours)
  }

  delete input._id

  Object.keys(result).forEach(key => {
    result[key] = convertDecimalNumber(result[key]);
  })

  return {
    ...input,
    ...result
  }

  /* eslint-enable */
}

module.exports = {
  serializeSalaryCalculatorData
}
