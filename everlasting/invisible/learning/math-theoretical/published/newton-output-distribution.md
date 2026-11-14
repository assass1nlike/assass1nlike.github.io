# 牛顿更新法与重新训练模型的输出分布接近性

[TOC]

# 命题

## 定理 1

假设优化梯度上有 $\mathbf b$ 的独立随机噪声（在满足一定条件下，相当于优化目标加上 $\mathbf w^\mathsf T\mathbf b$ 的独立随机噪声）取自密度函数为 $p(\cdot)$ 的分布，并且对于任意满足

$$
\|\mathbf b_1-\mathbf b_2\|_2\leq \epsilon'
$$

的 $\mathbf b_1,\mathbf b_2\in\mathbb R^d$，都有

$$
e^{-\epsilon}\leq \frac{p(\mathbf b_1)}{p(\mathbf b_2)}\leq e^\epsilon.
$$

则对于算法 $\widetilde A$ 产生的任意解 $\widetilde{\mathbf w}$，有

$$
e^{-\epsilon}
\leq
\frac{f_{\widetilde A}(\widetilde{\mathbf w})}
{f_A(\widetilde{\mathbf w})}
\leq
e^\epsilon.
$$

其中，$f_{\widetilde A}$ 和 $f_A$ 分别表示算法 $\widetilde A$ 与算法 $A$ 输出解的密度函数。

> 如果训练算法是完全确定的，那么给定删除后的数据集 $D'$，完整重训会输出一个固定模型。此时，只要快速遗忘得到的参数与完整重训的参数不完全相同，两种算法的输出分布就是集中在不同点上的点质量分布，这导致输出概率比一定是 0 或 $\infty$，衡量不了快速遗忘与重训模型的接近性，也即[牛顿更新法的残余梯度理论上界​](https://www.bilibili.com/opus/1238336064732528664?spm_id_from=333.1369.0.0)中证明的快速遗忘模型在 $D'$ 上的残余梯度足够小。
> 
> 因此，通过在训练目标中预先加入随机扰动，可以将该残余梯度解释为噪声的偏移小，进一步证明快速遗忘与完整重训的输出分布接近。

# 命题的证明

## 定理 1

记 $\mathbf u=\nabla_{\mathbf w} L(\mathbf w,D')$ 为近似算法优化结束后的梯度残差，$g_{\widetilde A}(\mathbf v)$ 为在算法 $\widetilde A$ 下 $\mathbf u$ 的概率密度；

[牛顿更新法的残余梯度理论上界​](https://www.bilibili.com/opus/1238336064732528664?spm_id_from=333.1369.0.0)中的定理 1 已经保证：

$$
\|\mathbf u\|_2\le \epsilon'.
$$

所以残差分布 $g_{\widetilde A}$ 只在半径为 $\epsilon'$ 的球内有概率质量。精确算法 $A$ 的残差则恒为零，$\mathbf u=0$.

定义 $\mathbf z=\mathbf b-\mathbf u$ 来表示把残差吸收进去之后的“有效噪声”，并定义 $q_A,q_{\widetilde A}$ 为有效噪声 $\mathbf z$ 在两个算法下的密度。如果残差取值为 $\mathbf u=\mathbf v$，那么为了得到给定的 $\mathbf z$，原始噪声必须是

$$
\mathbf b=\mathbf z+\mathbf v.
$$

因此，对所有可能的残差 $\mathbf v$ 积分，得到

$$
q_{\widetilde A}(\mathbf z)
=
\int g_{\widetilde A}(\mathbf v)p(\mathbf z+\mathbf v)\,d\mathbf v.
$$

这实际上是残差分布与噪声分布形成的卷积。由于残差只有在 $\|\mathbf v\|_2\le\epsilon'$ 时才可能出现，所以积分区域可以缩小为

$$
q_{\widetilde A}(\mathbf z)
=
\int_{\|\mathbf v\|_2\le\epsilon'}
g_{\widetilde A}(\mathbf v)p(\mathbf z+\mathbf v)\,d\mathbf v.
$$

由定理假设，如果两个噪声向量的距离不超过 $\epsilon'$，那么它们的密度比最多相差 $e^\epsilon$：

$$
e^{-\epsilon}
\le
\frac{p(\mathbf b_1)}{p(\mathbf b_2)}
\le
e^\epsilon.
$$

在积分中比较 $\mathbf z+\mathbf v$ 和 $\mathbf z$。因为

$$
\|(\mathbf z+\mathbf v)-\mathbf z\|_2
=
\|\mathbf v\|_2
\le\epsilon',
$$

所以

$$
p(\mathbf z+\mathbf v)
\le
e^\epsilon p(\mathbf z).
$$

代入积分（在球之外没有概率质量分布，所以第二个符号可以写成等号，哪怕积分区域扩大）：

$$
\begin{aligned}
q_{\widetilde A}(\mathbf z)
&\le
\int_{\|\mathbf v\|\le\epsilon'}
g_{\widetilde A}(\mathbf v)e^\epsilon p(\mathbf z)\,d\mathbf v\\
&=
e^\epsilon p(\mathbf z)
\int g_{\widetilde A}(\mathbf v)\,d\mathbf v\\
&=
e^\epsilon p(\mathbf z).
\end{aligned}
$$

由于 $g_{\widetilde A}$ 是概率密度，其积分等于 1。

对于精确算法 $A$，梯度残差恒为零，因此

$$
\mathbf z=\mathbf b-0=\mathbf b,
$$

所以

$$
q_A(\mathbf z)=p(\mathbf z).
$$

于是得到

$$
q_{\widetilde A}(\mathbf z)
\le
e^\epsilon q_A(\mathbf z).
$$

同理，由

$$
p(\mathbf z+\mathbf v)\ge e^{-\epsilon}p(\mathbf z)
$$

可以得到下界：

$$
q_{\widetilde A}(\mathbf z)
\ge e^{-\epsilon}q_A(\mathbf z).
$$

因此，有效噪声的两个分布满足

$$
\boxed{
e^{-\epsilon}
\le
\frac{q_{\widetilde A}(\mathbf z)}{q_A(\mathbf z)}
\le
e^\epsilon
}.
$$

现在还需要从“有效噪声分布接近”推出“模型输出分布接近”。

由 $\mathbf u$ 作为残差梯度的定义：

$$
\mathbf u=\nabla L(\widetilde{\mathbf w};D')
+
\mathbf b
.
$$

定义 $\mathbf z=\mathbf b-\mathbf u$，可以写成

$$
\nabla L(\widetilde{\mathbf w};D')+\mathbf z=0.
$$

这正是扰动目标

$$
L(\mathbf w;D')+\mathbf z^T\mathbf w
$$

的一阶最优条件。因为这个目标是强凸的，所以对于给定的 $\mathbf z$，最优解是唯一的。因此存在一个确定映射 $h$，使得

$$
\widetilde{\mathbf w}=h(\mathbf z).
$$

换言之，只要固定有效噪声 $\mathbf z$，无论它来自精确算法 $A$，还是近似算法 $\widetilde A$，最终对应的模型都是同一个唯一解（因为近似算法的误差 $\mathbf u$ 被 $\mathbf z=\mathbf b-\mathbf u$ 包含在内了），因此条件分布相同：

$$
f_{\widetilde A}(\widetilde{\mathbf w}\mid\mathbf z)
=
f_A(\widetilde{\mathbf w}\mid\mathbf z).
$$

二者的输出差异完全来自 $\mathbf z$ 的分布差异，而不是给定 $\mathbf z$ 后的求解规则。

利用全概率公式：

$$
f_{\widetilde A}(\widetilde{\mathbf w})
=
\int
f_{\widetilde A}(\widetilde{\mathbf w}\mid\mathbf z)
q_{\widetilde A}(\mathbf z)\,d\mathbf z.
$$

条件分布相同，所以

$$
f_{\widetilde A}(\widetilde{\mathbf w})
=
\int
f_A(\widetilde{\mathbf w}\mid\mathbf z)
q_{\widetilde A}(\mathbf z)\,d\mathbf z.
$$

再代入

$$
q_{\widetilde A}(\mathbf z)
\le e^\epsilon q_A(\mathbf z),
$$

得到

$$
\begin{aligned}
f_{\widetilde A}(\widetilde{\mathbf w})
&\le
\int
f_A(\widetilde{\mathbf w}\mid\mathbf z)
e^\epsilon q_A(\mathbf z)\,d\mathbf z\\
&=
e^\epsilon f_A(\widetilde{\mathbf w}).
\end{aligned}
$$

同样的方法给出下界：

$$
f_{\widetilde A}(\widetilde{\mathbf w})
\ge
e^{-\epsilon}f_A(\widetilde{\mathbf w}).
$$

最终得到：

$$
\boxed{
e^{-\epsilon}
\le
\frac{f_{\widetilde A}(\widetilde{\mathbf w})}
{f_A(\widetilde{\mathbf w})}
\le
e^\epsilon
}.
$$

总的来说，删除算法的优越性不是“残差出现的概率很小”，而是残差的范数很小，使它只能把噪声向量移动一小段距离；而定理假设噪声密度在这段距离内变化不大，因此最终模型的输出密度比也接近 1。
